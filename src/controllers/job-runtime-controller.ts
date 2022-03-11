import { Controller } from '@controllers/controller';
import { TimestampActions } from '@models/components/timestamp-actions';
import { HiatusModel, IHiatusSchema } from '@models/jobs/hiatus-schema';
import { Reminder } from '@models/jobs/reminder';
import { IReminderSchema, ReminderModel } from '@models/jobs/reminder-schema';
import { TimestampStatus } from '@models/ui/timestamp-status';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { SessionFinish, SessionNext } from '@src/commands';
import container from '@src/inversify.config';
import {
    EmbedLevel,
    EmbedType,
    Hiatus,
    HiatusStatus,
    ISessionSchema,
    NextReason,
    SessionModel,
} from '@src/models';
import {
    ConfigurationProvider,
    EmbedProvider,
    PermissionProvider,
    StringProvider,
} from '@src/providers';
import { ChannelService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { ButtonInteraction, Client, TextChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';
import moment = require('moment');

/** Handles all jobs */
@injectable()
export class JobRuntimeController extends Controller {
    private readonly channelService: ChannelService;
    private readonly scheduleService: ScheduleService;
    private readonly userService: UserService;
    private readonly messageService: MessageService;
    private readonly stringProvider: StringProvider;

    constructor(
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.PermissionProvider) permissionProvider: PermissionProvider,
        @inject(TYPES.StringProvider) stringProvider: StringProvider
    ) {
        super(logger, guildId, token, client, configuration, embedProvider, permissionProvider);
        this.channelService = channelService;
        this.userService = userService;
        this.scheduleService = scheduleService;
        this.messageService = messageService;
        this.stringProvider = stringProvider;
    }

    // region REMINDERS

    /**
     * Restores all active reminders from the Reminders collection in the Mongodb
     *
     * @returns The number of active reminders restored (excluding orphaned ones)
     */
    public async restoreRemindersFromDatabase(): Promise<number> {
        const activeReminders: IReminderSchema[] = await ReminderModel.find({});
        let restored = 0;

        for (const reminderEntry of activeReminders) {
            const user = await this.userService.getUserById(reminderEntry.userId);
            const channel = await this.channelService.getTextChannelByChannelId(
                reminderEntry.channelId
            );

            if (reminderEntry.date.getTime() < Date.now()) {
                this.logger.warn(
                    `Reminder (${reminderEntry.name}) is orphaned: Ran out at ${reminderEntry.date}`
                );
                continue;
            }

            const reminder = new Reminder(
                reminderEntry.name,
                user,
                reminderEntry.characterName,
                reminderEntry.date,
                channel,
                reminderEntry.iteration
            );

            await this.scheduleReminder(reminder, false);
            restored++;
        }

        return restored;
    }

    /**
     * Schedules a reminder internally
     *
     * @param reminder The reminder to schedule
     * @param saveToDatabase Whether the scheduling should be saved to the db or not
     * @returns Resolves when done
     */
    public async scheduleReminder(reminder: Reminder, saveToDatabase: boolean): Promise<void> {
        // See if a previous reminder exists. If so, delete it
        if (this.scheduleService.jobExists(reminder.name)) {
            const success = this.scheduleService.cancelJob(reminder.name);
            if (!success) this.logger.error(`Could not cancel reminder job internally`);
        }
        // Delete any existing reminder jobs in the database
        await ReminderModel.findOneAndDelete({
            channelId: reminder.channel.id,
        }).exec();

        // Define the job action
        const sendReminder = async (): Promise<void> => {
            this.logger.info(`Sending reminder ${reminder.name}...`);
            try {
                const hiatus = await HiatusModel.findOne({ userId: reminder.user.id }).exec();
                // Construct message
                let footer = '';
                let content = `*${reminder.characterName}* in <#${reminder.channel.id}>`;
                if (reminder.iteration === 0) {
                    footer = await this.stringProvider.get('JOB.REMINDER.FOOTER.FIRST');
                    if (await this.userService.userHasActiveHiatus(reminder.user.id)) {
                        content +=
                            `\n\n` +
                            (await this.stringProvider.get('JOB.REMINDER.DESCRIPTION.HIATUS'));
                    }
                } else if (reminder.iteration === 1) {
                    footer = await this.stringProvider.get('JOB.REMINDER.FOOTER.SECOND');
                    content += await this.stringProvider.get('JOB.REMINDER.DESCRIPTION.SECOND');
                    if (!hiatus) {
                        content += await this.stringProvider.get(
                            'JOB.REMINDER.DESCRIPTION.SECOND.HIATUS-HINT'
                        );
                    }
                }

                const message = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                    title: await this.stringProvider.get('JOB.REMINDER.TITLE'),
                    content: content,
                    authorName: reminder.user.username,
                    authorIcon: reminder.user.avatarURL(),
                    footer: footer,
                });

                // Send message to reminder channel
                const reminderChannelId = await this.configuration.getString(
                    'Channels_NotificationChannelId'
                );
                const channel = await this.channelService.getTextChannelByChannelId(
                    reminderChannelId
                );
                await channel.send({
                    content: `${await this.userService.getUserById(reminder.user.id)}`,
                    embeds: [message],
                });
                this.logger.info(
                    `Successfully sent reminder #${reminder.iteration} for ${reminder.name}.`
                );

                // Update the timestamp that the first reminder was sent
                await this.messageService.editTimestamp(
                    reminder.channel.id,
                    reminder.iteration === 0
                        ? TimestampStatus.FirstReminder
                        : TimestampStatus.SecondReminder
                );

                // Reschedule with the new time if it is under the limit for reminder iterations
                reminder.iteration++;
                if (reminder.iteration === 1) {
                    let newDate = moment()
                        .utc()
                        .add(
                            await this.configuration.getNumber(`Schedule_Reminder_1_Hours`),
                            'hours'
                        )
                        .add(
                            await this.configuration.getNumber(`Schedule_Reminder_1_Minutes`),
                            'minutes'
                        );

                    // Check if user is on hiatus
                    if (hiatus) {
                        newDate = newDate
                            .add(
                                await this.configuration.getNumber(`Schedule_Hiatus_Hours`),
                                'hours'
                            )
                            .add(
                                await this.configuration.getNumber(`Schedule_Hiatus_Minutes`),
                                'minutes'
                            );
                    }

                    reminder.date = newDate.toDate();
                    await this.scheduleReminder(reminder, true);
                    this.logger.info(
                        `Successfully rescheduled reminder #${reminder.iteration} for ${reminder.name}.`
                    );
                    return;
                }

                // Delete the job from the database
                await ReminderModel.findOneAndDelete({
                    channelId: reminder.channel.id,
                }).exec();
                this.logger.info(`Finished reminder job ${reminder.name}.`);

                // Last reminder before skip, send warning and set up skip prompt scheduling
                const embed = await this.embedProvider.get(
                    EmbedType.Technical,
                    EmbedLevel.Warning,
                    {
                        title: await this.stringProvider.get('JOB.REMINDER.WARNING.TITLE'),
                        content:
                            `**User:** ${
                                reminder.user.username
                            } (${await this.userService.getUserById(
                                reminder.user.id
                            )})\n**Channel:** <#${reminder.channel.id}>\n\n` +
                            `${await this.userService.getUserHiatusStatus(reminder.user.id)}`,
                    }
                );

                await this.messageService.sendInternalMessage({ embeds: [embed] });
            } catch (error) {
                this.logger.error(
                    `Failed to send reminder #${reminder.iteration} for ${reminder.name}: `,
                    this.logger.prettyError(error)
                );
            }
        };

        // Schedule the job
        this.scheduleService.scheduleJob(reminder.name, reminder.date, sendReminder);

        if (saveToDatabase) {
            // Add the reminder to mongodb for persistence
            const reminderModel = new ReminderModel({
                name: reminder.name,
                userId: reminder.user.id,
                characterName: reminder.characterName,
                date: reminder.date,
                channelId: reminder.channel.id,
                iteration: reminder.iteration,
            });

            try {
                const databaseResult = await reminderModel.save();
                this.logger.debug(
                    `Saved one ReminderModel to the database (ID: ${databaseResult._id}).`
                );
                return Promise.resolve();
            } catch (error) {
                this.logger.error(`Failed to save to MongoDB: `, this.logger.prettyError(error));
            }
        }
    }

    // endregion

    // region TIMESTAMP

    /**
     * Handles a button interaction on a timestamp post
     *
     * @param interaction The button interaction
     * @returns when done
     */
    public async handleTimestampInteraction(interaction: ButtonInteraction): Promise<void> {
        const action = interaction.customId.split(':')[1];
        const channelId = interaction.customId.split(':')[2];

        if (action === TimestampActions.NotifyUser) {
            this.logger.info(`Received notify request from timestamp interaction. Notifying...`);
            const session = await SessionModel.findOne({ channelId: channelId }).exec();

            if (!session) {
                this.logger.error(
                    `Could not find a session for channelId ${channelId} while trying to notify user on timestamp interaction.`
                );
                return;
            }

            const content = `*${session.currentTurn.name}* in <#${session.channelId}>`;
            const user = await this.client.users.fetch(session.currentTurn.userId);
            const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                title: await this.stringProvider.get('COMMAND.SESSION-NEXT.NOTIFICATION-TITLE'),
                content: content,
                authorName: user.username,
                authorIcon: user.avatarURL(),
                footer: `You've been manually notified by a Moderator.`,
            });
            const ping = `${await this.userService.getUserById(session.currentTurn.userId)}`;
            const notificationChannel: TextChannel =
                await this.channelService.getTextChannelByChannelId(
                    await this.configuration.getString('Channels_NotificationChannelId')
                );
            await notificationChannel.send({
                content: ping,
                embeds: [embed],
                allowedMentions: { users: [session.currentTurn.userId] },
            });

            this.logger.debug(
                `Notified user (ID: ${session.currentTurn.userId}) in via timestamp.`
            );
        } else if (action === TimestampActions.AdvanceTurn) {
            this.logger.info(`Received skip request from timestamp interaction. Skipping...`);
            const command: SessionNext = container.get('Next');
            await command.runInternally(channelId, NextReason.Skipped);
        } else if (action === TimestampActions.Finish) {
            this.logger.info(`Received finish request from timestamp interaction. Finishing...`);
            const command: SessionFinish = container.get('Finish');
            const session: ISessionSchema = await SessionModel.findOne({
                channelId: channelId,
            }).exec();
            await command.runInternally(session, false);
        }

        await interaction.deferUpdate();
        this.logger.info(`Handled timestamp post interaction.`);
    }

    // endregion

    // region HIATUS

    /**
     * Restores all active hiatus from the hiatus collection in the Mongodb
     *
     * @returns The number of active hiatus restored (excluding orphaned ones)
     */
    public async restoreHiatusFromDatabase(): Promise<number> {
        const activeHiatus: IHiatusSchema[] = await HiatusModel.find({});
        let restored = 0;

        for (const hiatusEntry of activeHiatus) {
            if (!hiatusEntry.expires) return;
            const user = await this.userService.getUserById(hiatusEntry.userId);

            if (moment(hiatusEntry.expires).isBefore(moment().utc())) {
                this.logger.warn(
                    `Hiatus for (${user.username}) is orphaned: Ran out at ${moment(
                        hiatusEntry.expires
                    ).toDate()}`
                );
                continue;
            }

            const hiatus: Hiatus = {
                user: user,
                reason: hiatusEntry.reason,
                hiatusPostId: hiatusEntry.hiatusPostId,
                expires: hiatusEntry.expires,
            };

            await this.scheduleHiatusFinish(hiatus);
            restored++;
        }

        return restored;
    }

    public async scheduleHiatusFinish(hiatus: Hiatus): Promise<void> {
        this.logger.debug(`Scheduling hiatus...`);
        const date = moment(hiatus.expires).toDate();

        const finishHiatus = async (): Promise<void> => {
            this.logger.info(`Finishing hiatus for ${hiatus.user.username}...`);
            const title = await this.stringProvider.get('JOB.WELCOME-BACK.TITLE');
            let content = await this.stringProvider.get('JOB.WELCOME-BACK.DESCRIPTION');
            content += '\n';
            let footer = '';

            const currentTurnsForUser: ISessionSchema[] = await SessionModel.find({
                'currentTurn.userId': hiatus.user.id,
            }).exec();

            if (!currentTurnsForUser || currentTurnsForUser?.length === 0) {
                this.logger.debug(`User ${hiatus.user.username} has no pending replies.`);
                content += await this.stringProvider.get(
                    'JOB.WELCOME-BACK.DESCRIPTION.HAS-NO-OPEN-REPLIES'
                );
            } else {
                this.logger.debug(
                    `User ${hiatus.user.username} has ${currentTurnsForUser.length} pending replies. Assembling content ...`
                );
                content += await this.stringProvider.get(
                    'JOB.WELCOME-BACK.DESCRIPTION.HAS-OPEN-REPLIES'
                );
                content += '\n\n';
                for (const session of currentTurnsForUser) {
                    const reminderModel = await ReminderModel.findOne({
                        channelId: session.channelId,
                    }).exec();

                    // See if a reminder is scheduled
                    const reminderName = `reminder:${session.channelId}`;
                    const reminderJob = this.scheduleService.getJob(reminderName);

                    if (!reminderJob) {
                        this.logger.warn(
                            `Couldn't find reminder job ${reminderName} for current turn (${session.channelId}) while trying to assemble pending replies for Hiatus finish.`
                        );
                        content += `**${session.currentTurn.name}** in <#${session.channelId}>\n`;
                        continue;
                    }
                    // If user is not on first reminder, do nothing
                    if (reminderModel.iteration === 0) return;

                    // See if removing the hiatus extension would make the RP reply overdue
                    const dateWithoutHiatusExtension = moment(
                        new Date(new Date(reminderJob.nextInvocation()))
                    )
                        .subtract(
                            await this.configuration.getNumber('Schedule_Hiatus_Minutes'),
                            'minutes'
                        )
                        .subtract(
                            await this.configuration.getNumber('Schedule_Hiatus_Hours'),
                            'hours'
                        )
                        .toDate();
                    const today = moment().utc();
                    if (today.isAfter(dateWithoutHiatusExtension)) {
                        // User is overdue to reply, cancel the reminder job
                        this.logger.debug(
                            `${reminderJob.name} is overdue (${dateWithoutHiatusExtension})`
                        );
                        this.scheduleService.cancelJob(reminderJob.name);

                        // Edit the timestamps
                        await this.messageService.editTimestamp(
                            session.channelId,
                            TimestampStatus.OverdueReminder,
                            undefined,
                            HiatusStatus.NoHiatus
                        );

                        content += `⚠ **${reminderModel.characterName}** in <#${reminderModel.channelId}>`;
                    } else {
                        // User is not overdue to reply, reschedule the next reminder
                        this.scheduleService.rescheduleJob(
                            reminderJob.name,
                            dateWithoutHiatusExtension
                        );

                        content += `**${reminderModel.characterName}** in <#${reminderModel.channelId}>`;

                        await this.messageService.editTimestamp(
                            session.channelId,
                            undefined,
                            undefined,
                            HiatusStatus.NoHiatus
                        );
                    }
                }
                if (content.includes('⚠')) {
                    footer = await this.stringProvider.get('JOB.WELCOME-BACK.FOOTER.OVERDUE');
                }
            }

            // Delete hiatus post
            this.logger.debug(`Deleting hiatus for ${hiatus.user.username}...`);
            await this.messageService.deleteHiatus(hiatus.hiatusPostId);
            await HiatusModel.findOneAndDelete({ userId: hiatus.user.id }).exec();

            // Send welcome back message
            this.logger.debug(`Sending welcome back message for user ${hiatus.user.username}...`);
            const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                authorIcon: hiatus.user.avatarURL(),
                authorName: hiatus.user.username,
                title: title,
                content: content,
                footer: footer,
            });
            const reminderChannel = this.channelService.getTextChannelByChannelId(
                await this.configuration.getString('Channels_NotificationChannelId')
            );
            await reminderChannel.send({
                content: `${await this.userService.getUserById(hiatus.user.id)}`,
                embeds: [embed],
            });

            this.logger.info(`Finished hiatus for ${hiatus.user.username}`);
        };

        // Schedule the job
        this.scheduleService.scheduleJob(`hiatus:${hiatus.user.id}`, date, finishHiatus);
    }

    // endregion
}
