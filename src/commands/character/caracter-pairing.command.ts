import {
    CharacterPairingModel,
    CharacterPairingSchema,
} from '@models/data/character-pairing-schema';
import { CharacterListType } from '@models/misc/character-list-type.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { Command } from '@src/commands';
import { CommandError, CommandResult, EmbedLevel, EmbedType, PermissionLevel } from '@src/models';
import { AwaitMessagesOptions, CommandInteraction, Message, MessageEmbed } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class CharacterPairing extends Command {
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
                    `No subcommand mapping for canon character subcommand ${subcommand}`
                );
        }

        return {
            executed: true,
            message: `Finished executing character pairing: ${subcommand}`,
        };
    }

    public async validateOptions(): Promise<void> {
        return;
    }

    private async add(interaction: CommandInteraction): Promise<void> {
        // Parse model
        this.logger.debug(`Parsing new character pairing model...`);
        const characterPairing = new CharacterPairingModel({
            game: Number.parseInt(interaction.options.getString('game')),
            userId1: interaction.options.getUser('user1').id,
            name1: interaction.options.getString('name1'),
            userId2: interaction.options.getUser('user2').id,
            name2: interaction.options.getString('name2'),
        });

        // Save to db
        try {
            this.logger.debug(`Saving character pairing model...`);
            await characterPairing.save();
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
            CharacterListType.Pairing
        );

        // Send reply
        let content =
            (await this.stringProvider.get('COMMAND.CHARACTER-PAIRING.ADD.SUCCESS')) + `\n\n`;
        content += await this.characterService.getCharacterListEntry(
            CharacterListType.Pairing,
            await this.characterMapper.mapCharacterPairingSchemaToCharacterPairing(characterPairing)
        );
        const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: content,
        });
        await this.interactionService.reply(interaction, { embeds: [embed] });
    }

    private async remove(interaction: CommandInteraction): Promise<void> {
        const game: DragonAgeGame = Number.parseInt(interaction.options.getString('game'));
        const characterPairingsForGame = await CharacterPairingModel.find({
            game: game,
        }).exec();

        if (characterPairingsForGame.length === 0) {
            const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Info, {
                content: await this.stringProvider.get(
                    'COMMAND.CHARACTER-PAIRING.REMOVE.NOTHING-TO-REMOVE'
                ),
            });
            await this.interactionService.reply(interaction, { embeds: [embed] });
            return;
        }

        this.logger.debug(`Sending query for character pairing: remove`);
        const embed = await this.getQueryEmbed(
            characterPairingsForGame,
            await this.stringProvider.get('COMMAND.CHARACTER-PAIRING.REMOVE.QUERY.QUESTION')
        );
        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });

        const authorFilter = (message: Message) =>
            message.author.id === interaction.member?.user?.id;
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
                } else if (position > characterPairingsForGame.length || position < 1) {
                    // Check if the number in in range
                    this.logger.info(
                        `User gave ${position} which is not in range of ${characterPairingsForGame.length}.`
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
                    const characterPairingToRemove = characterPairingsForGame[position - 1];
                    await CharacterPairingModel.deleteOne({
                        _id: characterPairingToRemove._id,
                    })
                        .exec()
                        .then(async () => {
                            await this.characterService.updateCharacterList(
                                game,
                                CharacterListType.Pairing
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CHARACTER-PAIRING.REMOVE.SUCCESS'
                                    ),
                                }
                            );
                            return;
                        })
                        .catch(async (error) => {
                            this.logger.error(
                                `Failed to remove the character pairing`,
                                this.logger.prettyError(error)
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Error,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.CHARACTER-PAIRING.REMOVE.FAILURE'
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
        pairings: CharacterPairingSchema[],
        queryText: string
    ): Promise<MessageEmbed> {
        let content = `Current character pairings:\n\n`;
        for (const pairing of pairings) {
            const index = pairings.indexOf(pairing);
            content += `${index + 1}. `;
            content += await this.characterService.getCharacterListEntry(
                CharacterListType.Pairing,
                await this.characterMapper.mapCharacterPairingSchemaToCharacterPairing(pairing)
            );
            content += '\n';
        }
        content += `\n${queryText}`;
        return await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            content: content,
        });
    }
}
