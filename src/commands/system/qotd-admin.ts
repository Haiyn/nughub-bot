import { Command } from '@src/commands';
import {
    CommandError,
    CommandResult,
    EmbedLevel,
    EmbedType,
    IQuestionSchema,
    PermissionLevel,
    QuestionModel,
} from '@src/models';
import { AwaitMessagesOptions, CommandInteraction, Message, MessageEmbed } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class QotdAdmin extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Moderator;

    public async run(interaction: CommandInteraction): Promise<CommandResult> {
        const subcommand = interaction.options.getSubcommand();
        this.logger.debug(`Matching subcommand for ${interaction.commandName}: ${subcommand}`);
        switch (subcommand) {
            case 'show':
                await this.show(interaction);
                break;
            case 'edit':
                await this.removeOrEdit(interaction, false);
                break;
            case 'remove':
                await this.removeOrEdit(interaction, true);
                break;
            default:
                throw new CommandError(
                    `No subcommand mapping for qotd admin subcommand ${subcommand}`
                );
        }

        return {
            executed: true,
            message: `Finished executing qotd admin: ${subcommand}`,
        };
    }

    public async validateOptions(): Promise<void> {
        return;
    }

    private async show(interaction: CommandInteraction): Promise<void> {
        const qotds = await QuestionModel.find({ used: false }).sort({ dateAdded: 1 }).exec();
        let embeds: MessageEmbed[] = await this.constructQotdQueueEmbeds(qotds);

        if (embeds.length === 0) {
            embeds = [
                await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Info, {
                    content: `There are no QOTDs in the queue.`,
                }),
            ];
        }

        await this.interactionService.reply(interaction, { embeds: embeds });
    }

    private async removeOrEdit(interaction: CommandInteraction, isRemove: boolean): Promise<void> {
        const qotds = await QuestionModel.find({ used: false }).sort({ dateAdded: 1 }).exec();
        let embeds: MessageEmbed[] = await this.constructQotdQueueEmbeds(qotds);
        if (embeds.length === 0) {
            embeds = [
                await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Info, {
                    content: `There are no QOTDs in the queue to ${isRemove ? 'remove' : 'edit'}.`,
                }),
            ];
            await this.interactionService.reply(interaction, { embeds: embeds });
            return;
        }

        const queryEmbed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            content: `Which QOTD would you like to ${
                isRemove ? 'remove' : 'edit'
            }? Please input a number.`,
        });
        embeds.push(queryEmbed);
        await this.interactionService.reply(interaction, { embeds: embeds });

        // Wait for response and handle it
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
                            content: `Your reply is not a valid number.`,
                        }
                    );
                }
                if (position > qotds.length || position < 1) {
                    // Check if the number in in range
                    this.logger.info(
                        `User gave ${position} which is not in range of ${qotds.length}.`
                    );
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Warning,
                        {
                            content: `The number you've given me is not in range.`,
                        }
                    );
                } else {
                    // Remove
                    const qotd = qotds[position - 1];
                    if (isRemove) {
                        this.logger.debug(`Removing qotd ${position - 1}: ${qotd.content}.`);
                        await QuestionModel.deleteOne({ _id: qotd._id });
                    } else {
                        this.logger.debug(
                            `Updating qotd ${position - 1}: Old: ${
                                qotd.content
                            }, New: ${interaction.options.getString('content')}.`
                        );
                        await QuestionModel.findOneAndUpdate(
                            { _id: qotd._id },
                            { content: interaction.options.getString('content') }
                        );
                    }
                    const member = await this.userService.getGuildMemberById(qotd.submitterId);
                    queryReply = await this.embedProvider.get(
                        EmbedType.Minimal,
                        EmbedLevel.Success,
                        {
                            content: `I've successfully ${
                                isRemove ? 'removed' : 'edited'
                            } the QOT:\n\n${position}. ${
                                qotd.content
                            } (submitted by ${await this.userService.getMemberDisplay(member)})`,
                        }
                    );
                }

                await message.reply({ embeds: [queryReply] });
            })
            .catch(async () => {
                queryReply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Warning, {
                    content: `COMMAND.VALIDATION.REPLY-QUERY.TIMEOUT`,
                });
                await interaction.channel.send({ embeds: [queryReply] });
                return;
            });
    }

    /**
     * Parses the passed qotds into embeds under consideration of the max character length for embeds
     *
     * @param qotds The qotds to display
     * @returns The parsed embeds
     */
    private async constructQotdQueueEmbeds(qotds: IQuestionSchema[]): Promise<MessageEmbed[]> {
        if (qotds.length === 0) {
            return [];
        }
        const embeds: MessageEmbed[] = [];
        const maxContentLength = 4096;
        let index = 1;
        let content = '';

        for (const qotd of qotds) {
            if (
                content.length + qotd.content.length + index.toString().length + 2 <
                maxContentLength
            ) {
                // If new qotd content still fits into the embed content, add it
                content += `**${index}.** ${qotd.content}` + '\n';
            } else {
                // If not, push the existing content to an embed and add it to a new one
                embeds.push(
                    await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                        title: embeds.length === 0 ? 'QOTDs Queue (oldest to newest)' : '',
                        content: content,
                    })
                );
                content = `**${index}.** ${qotd.content}` + '\n';
            }
            index++;
        }
        // Push the last embed if content is left
        if (content.length > 0) {
            embeds.push(
                await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                    title: embeds.length === 0 ? 'QOTDs Queue (oldest to newest)' : '',
                    content: content,
                })
            );
        }

        return embeds;
    }
}
