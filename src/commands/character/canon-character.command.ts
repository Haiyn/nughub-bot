import { CharacterChannelController } from '@controllers/character-channel-controller';
import { CanonCharacterModel, CanonCharacterSchema } from '@models/data/canon-character-schema';
import { CanonCharacterAvailability } from '@models/misc/canon-character-availability.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { Command } from '@src/commands';
import { JobRuntimeController } from '@src/controllers';
import { SessionMapper } from '@src/mappers';
import {
    CommandError,
    CommandResult,
    CommandValidationError,
    EmbedLevel,
    EmbedType,
    PermissionLevel,
} from '@src/models';
import {
    ConfigurationProvider,
    EmbedProvider,
    EmojiProvider,
    StringProvider,
} from '@src/providers';
import { ChannelService, HelperService, InteractionService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import {
    AwaitMessagesOptions,
    CacheType,
    Client,
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    MessageEmbed,
} from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class CanonCharacter extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Moderator;
    private readonly characterChannelController: CharacterChannelController;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.HelperService) helperService: HelperService,
        @inject(TYPES.InteractionService) interactionService: InteractionService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.EmojiProvider) emojiProvider: EmojiProvider,
        @inject(TYPES.JobRuntimeController) jobRuntime: JobRuntimeController,
        @inject(TYPES.SessionMapper) sessionMapper: SessionMapper,
        @inject(TYPES.CharacterChannelController)
        characterChannelController: CharacterChannelController
    ) {
        super(
            logger,
            client,
            configuration,
            channelService,
            helperService,
            interactionService,
            userService,
            scheduleService,
            messageService,
            stringProvider,
            embedProvider,
            emojiProvider,
            jobRuntime,
            sessionMapper
        );
        this.characterChannelController = characterChannelController;
    }

    public async run(interaction: CommandInteraction): Promise<CommandResult> {
        const subcommand = interaction.options.getSubcommand();
        this.logger.debug(`Matching subcommand for ${interaction.commandName}: ${subcommand}`);
        switch (subcommand) {
            case 'add':
                await this.add(interaction);
                break;
            case 'remove':
                await this.remove(interaction);
                break;
            case 'assign':
                await this.assign(interaction);
                break;
            case 'unassign':
                await this.unassign(interaction);
                break;
            default:
                throw new CommandError(
                    `No subcommand mapping for canon character subcommand ${subcommand}`
                );
        }

        return {
            executed: true,
            message: `Finished executing canon character: ${subcommand}`,
        };
    }

    public async validateOptions(
        options: Omit<CommandInteractionOptionResolver<CacheType>, 'getMessage' | 'getFocused'>
    ): Promise<void> {
        const subcommand = options.getSubcommand();
        if (subcommand === 'add') {
            if (
                options.getUser('claimer') &&
                Number.parseInt(options.getString('availability')) ===
                    CanonCharacterAvailability.Available
            ) {
                throw new CommandValidationError(
                    `User is trying to add an available canon character with a claimer.`,
                    await this.stringProvider.get(
                        'COMMAND.CANON-CHARACTER.VALIDATION.CANNOT-ADD-AVAILABLE-CHARACTER-WITH-CLAIMER'
                    )
                );
            }

            if (
                !options.getUser('claimer') &&
                Number.parseInt(options.getString('availability')) !==
                    CanonCharacterAvailability.Available
            ) {
                throw new CommandValidationError(
                    `User is trying to add a non-available canon character without a claimer.`,
                    await this.stringProvider.get(
                        'COMMAND.CANON-CHARACTER.VALIDATION.CANNOT-ADD-CLAIMED-CHARACTER-WITHOUT-CLAIMER'
                    )
                );
            }
        }
    }

    private async add(interaction: CommandInteraction): Promise<void> {
        // Parse model
        this.logger.debug(`Parsing new canon character model...`);
        const claimer = interaction.options.getUser('claimer');
        this.logger.trace(`Claimer ID for add command is: ${claimer?.id}`);
        const canonCharacter = new CanonCharacterModel({
            name: interaction.options.getString('name'),
            game: Number.parseInt(interaction.options.getString('game')),
            availability: Number.parseInt(interaction.options.getString('availability')),
            claimerId: claimer ? claimer.id : undefined,
        });

        // Save to db
        try {
            this.logger.debug(`Saving character model...`);
            await canonCharacter.save();
        } catch (error) {
            throw new CommandError(
                `Failed internally while saving to database.`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        }

        // Update character list
        await this.characterChannelController.updateCanonCharacterList(
            Number.parseInt(interaction.options.getString('game'))
        );

        // Send reply
        let content =
            (await this.stringProvider.get('COMMAND.CANON-CHARACTER.ADD.SUCCESS')) + `\n\n`;
        content += await this.characterChannelController.getCanonCharacterEntry(canonCharacter);
        const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: content,
        });
        await this.interactionService.reply(interaction, { embeds: [embed] });
    }

    private async remove(interaction: CommandInteraction): Promise<void> {
        const game: DragonAgeGame = Number.parseInt(interaction.options.getString('game'));
        const charactersForGame = await CanonCharacterModel.find({
            game: game,
        }).exec();

        if (charactersForGame.length === 0) {
            const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Info, {
                content: await this.stringProvider.get(
                    'COMMAND.CANON-CHARACTER.REMOVE.NOTHING-TO-REMOVE'
                ),
            });
            await this.interactionService.reply(interaction, { embeds: [embed] });
            return;
        }

        this.logger.debug(`Sending query for canon character: remove`);
        const embed = await this.getQueryEmbed(
            charactersForGame,
            await this.stringProvider.get('COMMAND.CANON-CHARACTER.REMOVE.QUERY.QUESTION')
        );
        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });

        const authorFilter = (message: Message) => message.author.id === interaction.member.user.id;
        const awaitMessageOptions: AwaitMessagesOptions = {
            filter: authorFilter,
            max: 1,
            time: 30000,
            errors: ['time'],
        };
        let queryReply: MessageEmbed = await this.embedProvider.get(
            EmbedType.Minimal,
            EmbedLevel.Error,
            { content: `Critical Error` }
        );
        interaction.channel
            .awaitMessages(awaitMessageOptions)
            .then(async (collection) => {
                // Get the first reply
                const message = collection.first();
                const position: number | typeof NaN = Number(message.content);
                if (isNaN(position) || !position) {
                    // Check if its a valid number
                    this.logger.info(
                        `User gave ${message.content} which is not a parsable number.`
                    );
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Warning,
                        {
                            content: await this.stringProvider.get(
                                'COMMAND.VALIDATION.REPLY-QUERY.NOT-A-NUMBER'
                            ),
                        }
                    );
                } else if (position > charactersForGame.length || position < 1) {
                    // Check if the number in in range
                    this.logger.info(
                        `User gave ${position} which is not in range of ${charactersForGame.length}.`
                    );
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Warning,
                        {
                            content: await this.stringProvider.get(
                                'COMMAND.VALIDATION.REPLY-QUERY.NUMBER-NOT-IN-RANGE'
                            ),
                        }
                    );
                } else {
                    // Remove
                    const characterToRemove = charactersForGame[position - 1];
                    await CanonCharacterModel.deleteOne({
                        _id: characterToRemove._id,
                    })
                        .exec()
                        .then(async () => {
                            await this.characterChannelController.updateCanonCharacterList(game);
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CANON-CHARACTER.REMOVE.SUCCESS',
                                        [characterToRemove.name]
                                    ),
                                }
                            );
                            return;
                        })
                        .catch(async (error) => {
                            this.logger.error(
                                `Failed to remove character ${characterToRemove.name}`,
                                this.logger.prettyError(error)
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Error,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CANON-CHARACTER.REMOVE.FAILURE',
                                        [characterToRemove.name]
                                    ),
                                }
                            );
                            return;
                        });
                }

                await message.reply({ embeds: [queryReply] });
            })
            .catch(async () => {
                queryReply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Warning, {
                    content: await this.stringProvider.get(
                        `COMMAND.VALIDATION.REPLY-QUERY.TIMEOUT`
                    ),
                });
                await interaction.channel.send({ embeds: [queryReply] });
                return;
            });
    }

    private async assign(interaction: CommandInteraction): Promise<void> {
        const game: DragonAgeGame = Number.parseInt(interaction.options.getString('game'));
        const charactersForGame = await CanonCharacterModel.find({
            game: game,
        }).exec();

        if (charactersForGame.length === 0) {
            const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Info, {
                content: await this.stringProvider.get(
                    'COMMAND.CANON-CHARACTER.ASSIGN.NOTHING-TO-ASSIGN'
                ),
            });
            await this.interactionService.reply(interaction, { embeds: [embed] });
            return;
        }

        this.logger.debug(`Sending query for canon character: assign`);
        const embed = await this.getQueryEmbed(
            charactersForGame,
            await this.stringProvider.get('COMMAND.CANON-CHARACTER.ASSIGN.QUERY.QUESTION')
        );
        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });

        const authorFilter = (message: Message) => message.author.id === interaction.member.user.id;
        const awaitMessageOptions: AwaitMessagesOptions = {
            filter: authorFilter,
            max: 1,
            time: 30000,
            errors: ['time'],
        };
        let queryReply: MessageEmbed = await this.embedProvider.get(
            EmbedType.Minimal,
            EmbedLevel.Error,
            { content: `Critical Error` }
        );
        interaction.channel
            .awaitMessages(awaitMessageOptions)
            .then(async (collection) => {
                // Get the first reply
                const message = collection.first();
                const position: number | typeof NaN = Number(message.content);
                if (isNaN(position) || !position) {
                    // Check if its a valid number
                    this.logger.info(
                        `User gave ${message.content} which is not a parsable number.`
                    );
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Warning,
                        {
                            content: await this.stringProvider.get(
                                'COMMAND.VALIDATION.REPLY-QUERY.NOT-A-NUMBER'
                            ),
                        }
                    );
                } else if (position > charactersForGame.length || position < 1) {
                    // Check if the number in in range
                    this.logger.info(
                        `User gave ${position} which is not in range of ${charactersForGame.length}.`
                    );
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Warning,
                        {
                            content: await this.stringProvider.get(
                                'COMMAND.VALIDATION.REPLY-QUERY.NUMBER-NOT-IN-RANGE'
                            ),
                        }
                    );
                } else {
                    // Assign
                    const characterToAssign = charactersForGame[position - 1];
                    const claimer = interaction.options.getUser('claimer');
                    const availability = Number.parseInt(
                        interaction.options.getString('availability')
                    );
                    await CanonCharacterModel.findOneAndUpdate(
                        {
                            _id: characterToAssign._id,
                        },
                        {
                            claimerId: claimer.id,
                            availability: availability,
                        }
                    )
                        .exec()
                        .then(async () => {
                            await this.characterChannelController.updateCanonCharacterList(game);
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CANON-CHARACTER.ASSIGN.SUCCESS',
                                        [characterToAssign.name, characterToAssign.claimerId]
                                    ),
                                }
                            );
                            return;
                        })
                        .catch(async (error) => {
                            this.logger.error(
                                `Failed to assign character ${characterToAssign.name}`,
                                this.logger.prettyError(error)
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Error,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CANON-CHARACTER.ASSIGN.FAILURE',
                                        [characterToAssign.name]
                                    ),
                                }
                            );
                            return;
                        });
                }

                await message.reply({ embeds: [queryReply] });
            })
            .catch(async () => {
                queryReply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Warning, {
                    content: await this.stringProvider.get(
                        `COMMAND.VALIDATION.REPLY-QUERY.TIMEOUT`
                    ),
                });
                await interaction.channel.send({ embeds: [queryReply] });
                return;
            });
    }

    private async unassign(interaction: CommandInteraction): Promise<void> {
        const game: DragonAgeGame = Number.parseInt(interaction.options.getString('game'));
        const charactersForGame = await CanonCharacterModel.find({
            game: game,
        }).exec();

        if (charactersForGame.length === 0) {
            const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Info, {
                content: await this.stringProvider.get(
                    'COMMAND.CANON-CHARACTER.UNASSIGN.NOTHING-TO-UNASSIGN'
                ),
            });
            await this.interactionService.reply(interaction, { embeds: [embed] });
            return;
        }

        this.logger.debug(`Sending query for canon character: unassign`);
        const embed = await this.getQueryEmbed(
            charactersForGame,
            await this.stringProvider.get('COMMAND.CANON-CHARACTER.UNASSIGN.QUERY.QUESTION')
        );
        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });

        const authorFilter = (message: Message) => message.author.id === interaction.member.user.id;
        const awaitMessageOptions: AwaitMessagesOptions = {
            filter: authorFilter,
            max: 1,
            time: 30000,
            errors: ['time'],
        };
        let queryReply: MessageEmbed = await this.embedProvider.get(
            EmbedType.Minimal,
            EmbedLevel.Error,
            { content: `Critical Error` }
        );
        interaction.channel
            .awaitMessages(awaitMessageOptions)
            .then(async (collection) => {
                // Get the first reply
                const message = collection.first();
                const position: number | typeof NaN = Number(message.content);
                this.logger.trace(position);
                if (isNaN(position) || !position) {
                    // Check if its a valid number
                    this.logger.info(
                        `User gave ${message.content} which is not a parsable number.`
                    );
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Warning,
                        {
                            content: await this.stringProvider.get(
                                'COMMAND.VALIDATION.REPLY-QUERY.NOT-A-NUMBER'
                            ),
                        }
                    );
                } else if (position > charactersForGame.length || position < 1) {
                    // Check if the number in in range
                    this.logger.info(
                        `User gave ${position} which is not in range of ${charactersForGame.length}.`
                    );
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Warning,
                        {
                            content: await this.stringProvider.get(
                                'COMMAND.VALIDATION.REPLY-QUERY.NUMBER-NOT-IN-RANGE'
                            ),
                        }
                    );
                } else {
                    // Unassign
                    const characterToUnassign = charactersForGame[position - 1];
                    await CanonCharacterModel.findOneAndUpdate(
                        {
                            _id: characterToUnassign._id,
                        },
                        {
                            $unset: { claimerId: 1 },
                            availability: CanonCharacterAvailability.Available,
                        }
                    )
                        .exec()
                        .then(async () => {
                            await this.characterChannelController.updateCanonCharacterList(game);
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CANON-CHARACTER.UNASSIGN.SUCCESS',
                                        [characterToUnassign.name]
                                    ),
                                }
                            );
                            return;
                        })
                        .catch(async (error) => {
                            this.logger.error(
                                `Failed to unassign character ${characterToUnassign.name}`,
                                this.logger.prettyError(error)
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Error,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CANON-CHARACTER.UNASSIGN.FAILURE',
                                        [characterToUnassign.name]
                                    ),
                                }
                            );
                            return;
                        });
                }

                await message.reply({ embeds: [queryReply] });
            })
            .catch(async (error) => {
                this.logger.trace(error);
                queryReply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Warning, {
                    content: await this.stringProvider.get(
                        `COMMAND.VALIDATION.REPLY-QUERY.TIMEOUT`
                    ),
                });
                await interaction.channel.send({ embeds: [queryReply] });
                return;
            });
    }

    private async getQueryEmbed(
        characters: CanonCharacterSchema[],
        queryText: string
    ): Promise<MessageEmbed> {
        let content = `Current canon characters:\n\n`;
        for (const character of characters) {
            const index = characters.indexOf(character);
            content += `${index + 1}. **${character.name}** `;
            if (character.claimerId) {
                character.availability === CanonCharacterAvailability.TemporaryClaim
                    ? (content += `temp`)
                    : '';
                content += ` claimed by ${await this.userService.getUserById(character.claimerId)}`;
            } else {
                content += ` available`;
            }
            content += `\n`;
        }
        content += `\n${queryText}`;
        return await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            content: content,
        });
    }
}
