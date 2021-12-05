import { Controller } from '@controllers/controller';
import { Reminder } from '@models/jobs/reminder';
import { IReminderSchema, ReminderModel } from '@models/jobs/reminder-schema';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { EmbedLevel, EmbedType } from '@src/models';
import {
    ConfigurationProvider,
    EmbedProvider,
    PermissionProvider,
    StringProvider,
} from '@src/providers';
import { ChannelService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

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
                // Construct message
                const message = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                    title: await this.stringProvider.get('JOB.REMINDER.TITLE'),
                    content: `*${reminder.characterName}* in <#${reminder.channel.id}>`,
                    authorName: reminder.user.username,
                    authorIcon: reminder.user.avatarURL(),
                    footer: `This is your ${reminder.iteration + 1}${
                        reminder.iteration === 0
                            ? 'st'
                            : reminder.iteration === 1
                            ? 'nd'
                            : reminder.iteration === 2
                            ? 'rd'
                            : 'th'
                    } reminder.`,
                });

                // Send message to reminder channel
                const reminderChannelId = await this.configuration.getString(
                    'Channels_NotificationChannelId'
                );
                const channel = await this.channelService.getTextChannelByChannelId(
                    reminderChannelId
                );
                await channel.send({
                    content: `<@${reminder.user.id}>`,
                    embeds: [message],
                });
                this.scheduleService.cancelJob(reminder.name);
                this.logger.info(
                    `Successfully sent reminder #${reminder.iteration} for ${reminder.name}.`
                );

                // If it is not the first reminder, send an internal message
                if (reminder.iteration > 0) {
                    const embed = await this.embedProvider.get(
                        EmbedType.Technical,
                        EmbedLevel.Warning,
                        {
                            title: 'Reminder Warning',
                            content:
                                `User **${reminder.user.username}** has not replied after the first reminder:\n*${reminder.characterName}* in <#${reminder.channel.id}>\n\n` +
                                `This is their ${reminder.iteration + 1}${
                                    reminder.iteration === 0
                                        ? 'st'
                                        : reminder.iteration === 1
                                        ? 'nd'
                                        : reminder.iteration === 2
                                        ? 'rd'
                                        : 'th'
                                } reminder.`,
                        }
                    );

                    await this.messageService.sendInternalMessage({ embeds: [embed] });
                }

                // Reschedule with the new time if it is under the limit for reminder iterations
                reminder.iteration++;
                const reminderCount = Number.parseInt(
                    await this.configuration.getString(`Schedule_Reminder_Count`)
                );
                if (reminder.iteration < reminderCount) {
                    const validIterationForConfig = (await this.configuration.exists(
                        `Schedule_Reminder_${reminder.iteration}_Hours`
                    ))
                        ? reminder.iteration
                        : 0;
                    const newDate = new Date(new Date().getTime());
                    const reminderHours = Number.parseInt(
                        await this.configuration.getString(
                            `Schedule_Reminder_${validIterationForConfig}_Hours`
                        )
                    );
                    const reminderMinutes = Number.parseInt(
                        await this.configuration.getString(
                            `Schedule_Reminder_${validIterationForConfig}_Minutes`
                        )
                    );
                    newDate.setHours(
                        newDate.getHours() + reminderHours,
                        newDate.getMinutes() + reminderMinutes
                    );
                    reminder.date = newDate;
                    await this.scheduleReminder(reminder, true);
                    this.logger.info(
                        `Successfully rescheduled reminder #${reminder.iteration} for ${reminder.name}.`
                    );
                } else {
                    // Delete the job from the database
                    await ReminderModel.findOneAndDelete({
                        channelId: reminder.channel.id,
                    }).exec();
                    this.logger.info(`Finished reminder job ${reminder.name}.`);
                }
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
}
