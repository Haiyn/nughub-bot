import { ReminderModel } from '@models/jobs/reminder-schema';
import { NextReason } from '@models/ui/next-reason.enum';
import { Command, SessionNext } from '@src/commands';
import container from '@src/inversify.config';
import {
    Character,
    CommandError,
    CommandResult,
    CommandValidationError,
    EmbedLevel,
    EmbedType,
    PermissionLevel,
    Session,
    SessionModel,
    TimestampStatus,
} from '@src/models';
import {
    AwaitMessagesOptions,
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    MessageEmbed,
} from 'discord.js';
import { injectable } from 'inversify';
import moment = require('moment');

@injectable()
export class SessionEdit extends Command {
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
            case 'set':
                await this.set(interaction);
                break;
            default:
                throw new CommandError(
                    `No subcommand mapping for strings subcommand ${subcommand}`
                );
        }

        return {
            executed: true,
            message: `Finished executing edit: ${subcommand}`,
        };
    }

    public async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        const channel = this.channelService.getTextChannelByChannelId(
            options.getChannel('channel').id
        );

        const session = await SessionModel.findOne({ channelId: channel.id }).exec();

        if (!session) {
            throw new CommandValidationError(
                `User provided a channel that has no active RP.`,
                await this.stringProvider.get('COMMAND.SESSION-EDIT.VALIDATION.NO-ONGOING-RP', [
                    channel.id,
                ])
            );
        }

        if (options.getUser('user')) {
            const user = options.getUser('user');
            const name = options.getString('name');
            for (const character of session.turnOrder) {
                if (character.userId === user?.id && character.name === name) {
                    throw new CommandValidationError(
                        `User provided a character to add that already exists in the turn order.`,
                        await this.stringProvider.get(
                            'COMMAND.SESSION-EDIT.VALIDATION.CHARACTER-ALREADY-EXISTS',
                            [channel.id]
                        )
                    );
                }
            }
        }
    }

    private async add(interaction: CommandInteraction): Promise<void> {
        const sessionToEdit = await this.getSession(interaction.options.getChannel('channel').id);

        this.logger.debug(`Sending query for session edit: add`);
        const embed = await this.getQueryEmbed(
            sessionToEdit,
            'At which position would you like to add the user?'
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
                // Get the first reply and check if its a valid number
                const message = collection.first();
                const position: number | typeof NaN = Number(message.content);
                if (isNaN(position) || !position) {
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
                } else if (position > sessionToEdit.turnOrder.length + 1 || position - 1 < 0) {
                    this.logger.info(
                        `User gave ${position} which is not in range of ${
                            sessionToEdit.turnOrder.length + 1
                        }.`
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
                    const characterToAdd: Character = {
                        member: await this.userService.getGuildMemberById(
                            interaction.options.getUser('user').id
                        ),
                        name: interaction.options.getString('name'),
                    };
                    await this.addToTurnOrder(sessionToEdit, characterToAdd, position - 1)
                        .then(async () => {
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.SESSION-EDIT.SUCCESS.ADD'
                                    ),
                                }
                            );
                            return;
                        })
                        .catch(async (error) => {
                            this.logger.error(
                                `Failed to add to turn order for ${sessionToEdit.channel.name}`,
                                this.logger.prettyError(error)
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Error,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.SESSION-EDIT.ERROR.COULD-NOT-ADD'
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
                        'COMMAND.VALIDATION.REPLY-QUERY.TIMEOUT'
                    ),
                });
                await interaction.channel.send({ embeds: [queryReply] });
                return;
            });
    }

    public async remove(interaction: CommandInteraction): Promise<void> {
        const sessionToEdit = await this.getSession(interaction.options.getChannel('channel').id);

        this.logger.debug(`Sending query for session edit: remove`);
        const embed = await this.getQueryEmbed(
            sessionToEdit,
            'Which user would you like to remove? Please input a number.'
        );
        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });

        this.logger.debug(`Sending query for session edit: add`);
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
                } else if (position > sessionToEdit.turnOrder.length || position < 1) {
                    // Check if the number in in range
                    this.logger.info(
                        `User gave ${position} which is not in range of ${sessionToEdit.turnOrder.length}.`
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
                    await this.removeFromTurnOrder(sessionToEdit, position - 1)
                        .then(async () => {
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.SESSION-EDIT.SUCCESS.REMOVE'
                                    ),
                                }
                            );
                            return;
                        })
                        .catch(async (error) => {
                            this.logger.error(
                                `Failed to remove from turn order for ${sessionToEdit.channel.name}`,
                                this.logger.prettyError(error)
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Error,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.SESSION-EDIT.ERROR.COULD-NOT-REMOVE'
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
                        'COMMAND.VALIDATION.REPLY-QUERY.TIMEOUT'
                    ),
                });
                await interaction.channel.send({ embeds: [queryReply] });
                return;
            });
    }

    private async set(interaction: CommandInteraction): Promise<void> {
        const sessionToEdit = await this.getSession(interaction.options.getChannel('channel').id);

        this.logger.debug(`Sending query for session edit: set`);
        const embed = await this.getQueryEmbed(
            sessionToEdit,
            'Whose turn should it be? Please enter a number.'
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
                } else if (position > sessionToEdit.turnOrder.length || position < 1) {
                    // Check if the number in in range
                    this.logger.info(
                        `User gave ${position} which is not in range of ${sessionToEdit.turnOrder.length}.`
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
                    // Set new current turn
                    const shouldNotify = interaction.options.getBoolean('notify');
                    await this.setNewTurn(sessionToEdit, position - 1, shouldNotify)
                        .then(async () => {
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Success,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.SESSION-EDIT.SUCCESS.SET'
                                    ),
                                }
                            );
                            return;
                        })
                        .catch(async (error) => {
                            this.logger.error(
                                `Failed to set new turn for ${sessionToEdit.channel.name}`,
                                this.logger.prettyError(error)
                            );
                            queryReply = await this.embedProvider.get(
                                EmbedType.Minimal,
                                EmbedLevel.Error,
                                {
                                    content: await this.stringProvider.get(
                                        'COMMAND.SESSION-EDIT.ERROR.COULD-NOT-SET'
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
                        'COMMAND.VALIDATION.REPLY-QUERY.TIMEOUT'
                    ),
                });
                await interaction.channel.send({ embeds: [queryReply] });
                return;
            });
    }

    /**
     * Gets a session from the mongodb
     *
     * @param channelId the channel id to fetch with
     * @returns the session
     */
    private async getSession(channelId: string): Promise<Session> {
        this.logger.debug(`Parsing session for session edit`);
        const foundSession = await SessionModel.findOne({
            channelId: channelId,
        }).exec();
        return await this.sessionMapper.mapSessionSchemaToSession(foundSession);
    }

    /**
     * Gets an embed that queries the user with a turn order and a question
     *
     * @param session the session which the turn order will be pulled from
     * @param queryText The text the user should be queried with
     * @returns an embed
     */
    private async getQueryEmbed(session: Session, queryText: string): Promise<MessageEmbed> {
        let turnOrderString = `Current turn order for ${session.channel}:\n\n`;
        session.turnOrder.forEach((character, index) => {
            if (
                character.member?.id === session.currentTurn.member?.id &&
                character.name === session.currentTurn.name
            ) {
                turnOrderString += `➡️ `;
            }
            turnOrderString += `${index + 1}. **${
                character.name
            }** - ${this.userService.getMemberDisplay(character.member)}\n`;
        });
        turnOrderString += `\n${queryText}`;
        return await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            content: turnOrderString,
        });
    }

    /**
     * Adds a character to a session
     *
     * @param session The session to add the character to
     * @param characterToAdd The character to add
     * @param atPosition at which position the character should be added. Starts at 0
     * @returns when done
     */
    private async addToTurnOrder(session: Session, characterToAdd: Character, atPosition: number) {
        session.turnOrder.splice(atPosition, 0, characterToAdd);
        const newSession = this.sessionMapper.mapSessionToSessionSchema(session);

        await SessionModel.findOneAndUpdate(
            { channelId: session.channel.id },
            { turnOrder: newSession.turnOrder }
        ).exec();

        await this.sessionService.updateSessionPost(newSession);
    }

    /**
     * Removes a character at a given position from the turn order
     *
     * @param session the session to edit
     * @param atPosition the position which should be removed. Starts at 0
     * @returns when done
     */
    private async removeFromTurnOrder(session: Session, atPosition: number) {
        const characterToRemove = session.turnOrder[atPosition];

        // If the character to remove is the current turn, advance the turn first
        if (
            characterToRemove.member?.id === session.currentTurn.member?.id &&
            characterToRemove.name === session.currentTurn.name
        ) {
            this.logger.debug(`User to remove is current turn user, advancing turn...`);
            const nextCommand: SessionNext = container.get('Next');
            await nextCommand.runInternally(session.channel.id, NextReason.Removed);
        }

        // Remove from turn order and update
        session.turnOrder.splice(atPosition, 1);
        const newSession = this.sessionMapper.mapSessionToSessionSchema(session);
        await SessionModel.findOneAndUpdate(
            { channelId: session.channel.id },
            { turnOrder: newSession.turnOrder }
        ).exec();

        await this.sessionService.updateSessionPost(newSession);
    }

    /**
     * Sets a new current turn
     *
     * @param session the session in which the new current turn should be set
     * @param atPosition The position of the character that should be the new current turn
     * @param shouldNotify Whether or not the notification and reminder should be set or not
     * @returns when done
     */
    private async setNewTurn(
        session: Session,
        atPosition: number,
        shouldNotify: boolean
    ): Promise<void> {
        let newSession;
        if (shouldNotify) {
            // If the new current turn should be notified and reminded as normal, use the next command
            // so we don't have to reimplement the whole notifying and scheduling
            // For this, we set the current turn to the user before it, then next command them
            if (atPosition === 0) {
                atPosition = session.turnOrder.length - 1;
            } else {
                atPosition = atPosition - 1;
            }

            this.logger.debug(
                `Setting new turn for user ${session.turnOrder[atPosition].member.displayName}. User for edit set at position ${atPosition} will be next-ed.`
            );

            session.currentTurn = session.turnOrder[atPosition];
            newSession = this.sessionMapper.mapSessionToSessionSchema(session);
            await SessionModel.findOneAndUpdate(
                { channelId: session.channel.id },
                { currentTurn: newSession.currentTurn }
            ).exec();

            const nextCommand: SessionNext = container.get('Next');
            await nextCommand.runInternally(session.channel.id, NextReason.ManuallySet);
        } else {
            // If user should not be notified, simply set the new turn in the database
            session.currentTurn = session.turnOrder[atPosition];
            this.logger.debug(
                `Setting new turn for user ${session.currentTurn.member?.user?.username}`
            );

            newSession = this.sessionMapper.mapSessionToSessionSchema(session);
            await SessionModel.findOneAndUpdate(
                { channelId: session.channel.id },
                { currentTurn: newSession.currentTurn }
            ).exec();

            // cancel the existing reminder
            await ReminderModel.findOneAndDelete({ channelId: session.channel.id }).exec();
            const jobName = `reminder:${session.channel.id}`;
            if (this.scheduleService.jobExists(jobName)) {
                this.scheduleService.cancelJob(jobName);
            }

            // We also need to edit the timestamp
            const footer = await this.hiatusService.getUserHiatusStatus(
                session.currentTurn.member?.id
            );
            let content = `**Channel:**\t<#${
                session.channel.id
            }>\n**User:**\t${await this.userService.getMemberDisplay(
                session.currentTurn.member
            )}\n**Character:**\t${session.currentTurn.name}\n\n`;
            content += `**Last Turn Advance:** <t:${moment.utc().unix()}:F> (<t:${moment
                .utc()
                .unix()}:R>)\n`;
            await this.timestampService.editTimestamp(
                session.channel.id,
                TimestampStatus.ManuallySetTurn,
                content,
                footer
            );

            // and the turn order post
            await this.sessionService.updateSessionPost(newSession);
        }
    }
}
