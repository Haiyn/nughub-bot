import { CharacterChannelController } from '@controllers/character-channel-controller';
import {
    OriginalCharacterModel,
    OriginalCharacterSchema,
} from '@models/data/original-character-schema';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { Command } from '@src/commands';
import { JobRuntimeController } from '@src/controllers';
import { SessionMapper } from '@src/mappers';
import { CommandError, CommandResult, EmbedLevel, EmbedType, PermissionLevel } from '@src/models';
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
    Client,
    CommandInteraction,
    Message,
    MessageEmbed,
} from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class OriginalCharacter extends Command {
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
            default:
                throw new CommandError(
                    `No subcommand mapping for original character subcommand ${subcommand}`
                );
        }

        return {
            executed: true,
            message: `Finished executing original character: ${subcommand}`,
        };
    }

    public async validateOptions(): Promise<void> {
        return;
    }

    private async add(interaction: CommandInteraction): Promise<void> {
        // Parse model
        this.logger.debug(`Parsing new original character model...`);
        const originalCharacter = new OriginalCharacterModel({
            userId: interaction.options.getUser('user').id,
            name: interaction.options.getString('name'),
            game: Number.parseInt(interaction.options.getString('game')),
            race: interaction.options.getString('race'),
            age: interaction.options.getString('age'),
        });

        // Save to db
        try {
            this.logger.debug(`Saving original character model...`);
            await originalCharacter.save();
        } catch (error) {
            throw new CommandError(
                `Failed internally while saving to database.`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        }

        // Update character list
        await this.characterChannelController.updateOriginalCharacterList(
            Number.parseInt(interaction.options.getString('game'))
        );

        // Send reply
        let content = `I've successfully added the following character to the original character list:\n\n`;
        content += `**${originalCharacter.name}** (${originalCharacter.race}, ${
            originalCharacter.age
        }) ${await this.userService.getUserById(originalCharacter.userId)}`;

        const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: content,
        });
        await this.interactionService.reply(interaction, { embeds: [embed] });
    }

    private async remove(interaction: CommandInteraction): Promise<void> {
        const game: DragonAgeGame = Number.parseInt(interaction.options.getString('game'));
        const charactersForGame = await OriginalCharacterModel.find({
            game: game,
        }).exec();

        if (charactersForGame.length === 0) {
            const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Info, {
                content: `There are no original characters that you can remove.`,
            });
            await this.interactionService.reply(interaction, { embeds: [embed] });
            return;
        }

        this.logger.debug(`Sending query for original character: remove`);
        const embed = await this.getQueryEmbed(
            charactersForGame,
            'Which OC would you like to remove? Please input a number.'
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
                    await OriginalCharacterModel.deleteOne({
                        _id: characterToRemove._id,
                    })
                        .exec()
                        .then(async () => {
                            await this.characterChannelController.updateOriginalCharacterList(game);
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: `I've successfully removed the original character '${characterToRemove.name}'.`,
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
                                    content: `I couldn't remove the character '${characterToRemove.name}'.`,
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

    private async getQueryEmbed(
        characters: OriginalCharacterSchema[],
        queryText: string
    ): Promise<MessageEmbed> {
        let content = `Current original characters:\n\n`;
        for (const character of characters) {
            const index = characters.indexOf(character);
            const user = await this.userService.getUserById(character.userId);
            content += `${index + 1}. **${character.name}** (${character.race}, ${
                character.age
            }) ${user}\n`;
        }
        content += `\n${queryText}`;
        return await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            content: content,
        });
    }
}
