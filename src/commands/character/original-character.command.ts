import {
    OriginalCharacterModel,
    OriginalCharacterSchema,
} from '@models/data/original-character-schema';
import { CharacterListType } from '@models/misc/character-list-type.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { Command } from '@src/commands';
import {
    CommandError,
    CommandResult,
    CommandValidationError,
    EmbedLevel,
    EmbedType,
    PermissionLevel,
} from '@src/models';
import {
    AwaitMessagesOptions,
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    MessageEmbed,
} from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class OriginalCharacter extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Moderator;

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

    public async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        if (options.getString('age')) {
            const number = Number(options.getString('age'));
            if (!number || isNaN(number)) {
                throw new CommandValidationError(
                    `User gave an invalid number for the age parameter: ${options.getString(
                        'age'
                    )}`,
                    await this.stringProvider.get(
                        'COMMAND.ORIGINAL-CHARACTER.VALIDATION.AGE-NOT-A-NUMBER'
                    )
                );
            }
        }
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
            pronouns: interaction.options.getString('pronouns'),
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
        await this.characterService.updateCharacterList(
            Number.parseInt(interaction.options.getString('game')),
            CharacterListType.Original
        );

        // Send reply
        let content = await this.stringProvider.get('COMMAND.ORIGINAL-CHARACTER.ADD.SUCCESS');
        content += `\n\n`;
        content += this.characterService.getCharacterListEntry(
            CharacterListType.Original,
            await this.characterMapper.mapOriginalCharacterSchemaToOriginalCharacter(
                originalCharacter
            )
        );

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
                content: await this.stringProvider.get(
                    'COMMAND.ORIGINAL-CHARACTER.REMOVE.NOTHING-TO-REMOVE'
                ),
            });
            await this.interactionService.reply(interaction, { embeds: [embed] });
            return;
        }

        this.logger.debug(`Sending query for original character: remove`);
        const embed = await this.getQueryEmbed(
            charactersForGame,
            await this.stringProvider.get('COMMAND.ORIGINAL-CHARACTER.REMOVE.QUERY.QUESTION')
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
                            await this.characterService.updateCharacterList(
                                game,
                                CharacterListType.Original
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.ORIGINAL-CHARACTER.REMOVE.SUCCESS',
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
                                        'COMMAND.ORIGINAL-CHARACTER.REMOVE.FAILURE',
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

    private async getQueryEmbed(
        characters: OriginalCharacterSchema[],
        queryText: string
    ): Promise<MessageEmbed> {
        let content = `Current original characters:\n\n`;
        for (const character of characters) {
            const index = characters.indexOf(character);
            content += `${index + 1}. `;
            content += await this.characterService.getCharacterListEntry(
                CharacterListType.Original,
                await this.characterMapper.mapOriginalCharacterSchemaToOriginalCharacter(character)
            );
            content += '\n';
        }
        content += `\n${queryText}`;
        return await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            content: content,
        });
    }
}
