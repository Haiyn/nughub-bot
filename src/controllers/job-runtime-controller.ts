import { Controller } from '@controllers/controller';
import { ButtonType } from '@models/components/button-type';
import { SkipPromptActions } from '@models/components/skip-prompt-actions';
import { TimestampActions } from '@models/components/timestamp-actions';
import { Reminder } from '@models/jobs/reminder';
import { IReminderSchema, ReminderModel } from '@models/jobs/reminder-schema';
import { TimestampStatus } from '@models/ui/timestamp-status';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { SessionFinish, SessionNext } from '@src/commands';
import container from '@src/inversify.config';
import { EmbedLevel, EmbedType, ISessionSchema, SessionModel } from '@src/models';
import {
    ConfigurationProvider,
    EmbedProvider,
    PermissionProvider,
    StringProvider,
} from '@src/providers';
import { ChannelService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { ButtonInteraction, Client, MessageActionRow, MessageButton } from 'discord.js';
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
                let footer = '';
                switch (reminder.iteration) {
                    case 0:
                        footer = await this.stringProvider.get('JOB.REMINDER.FOOTER.FIRST');
                        break;
                    case 1:
                        footer = await this.stringProvider.get('JOB.REMINDER.FOOTER.SECOND');
                        break;
                }
                const message = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                    title: await this.stringProvider.get('JOB.REMINDER.TITLE'),
                    content: `*${reminder.characterName}* in <#${reminder.channel.id}>`,
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
                    content: `<@${reminder.user.id}>`,
                    embeds: [message],
                });
                this.scheduleService.cancelJob(reminder.name);
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
                if (reminder.iteration < 2) {
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
                        title: 'Reminder Warning',
                        content:
                            `**User:** ${reminder.user.username} (<@${reminder.user.id}>)\n**Channel:** <#${reminder.channel.id}>\n\n` +
                            `${reminder.user.username} has not replied after the first reminder:\n*${reminder.characterName}* in <#${reminder.channel.id}>`,
                    }
                );

                await this.messageService.sendInternalMessage({ embeds: [embed] });

                // Schedule skip prompt
                await this.scheduleSkipPrompt(reminder);
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

    /**
     * Schedules sending a skip prompt for moderators after the last reminder
     *
     * @param reminder The last reminder
     * @returns when done
     */
    public async scheduleSkipPrompt(reminder: Reminder): Promise<void> {
        this.logger.debug(`Scheduling skip prompt following ${reminder.name}...`);
        // Parse time for skip prompt
        const skipPromptMinutes = Number.parseInt(
            await this.configuration.getString(`Schedule_SkipPrompt_Minutes`)
        );
        const skipPromptHours = Number.parseInt(
            await this.configuration.getString(`Schedule_SkipPrompt_Hours`)
        );
        const newSkipPromptDate = new Date(new Date().getTime());
        newSkipPromptDate.setHours(
            newSkipPromptDate.getHours() + skipPromptHours,
            newSkipPromptDate.getMinutes() + skipPromptMinutes
        );

        // Define the skip prompt send action
        const sendSkipPrompt = async (): Promise<void> => {
            this.logger.debug(`Sending skip prompt for ${reminder.name}...`);
            let message = `**User:** ${reminder.user.username} (<@${reminder.user.id}>)\n**Channel:** ${reminder.channel}\n\n`;
            message += `${reminder.user.username} has not replied in the `;
            message +=
                skipPromptMinutes != 0
                    ? `${skipPromptHours} hours and ${skipPromptMinutes} minutes `
                    : `${skipPromptHours} hours `;
            message += `since the last reminder. They can now be skipped.`;
            const embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Warning, {
                title: 'Skip Warning',
                content: message,
            });

            const components = new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId(
                        `${ButtonType.SkipPrompt}:${SkipPromptActions.Skip}:${reminder.channel.id}`
                    )
                    .setLabel('Skip now')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setCustomId(
                        `${ButtonType.SkipPrompt}:${SkipPromptActions.Dismiss}:${reminder.channel.id}`
                    )
                    .setLabel('Dismiss')
                    .setStyle('SECONDARY'),
            ]);

            await this.messageService.sendInternalMessage({
                embeds: [embed],
                components: [components],
            });

            await this.messageService.editTimestamp(
                reminder.channel.id,
                TimestampStatus.SkipPromptActive
            );
        };

        // Schedule the job
        this.scheduleService.scheduleJob(
            reminder.name + ' Skip Prompt',
            newSkipPromptDate,
            sendSkipPrompt
        );
    }

    /**
     * Handles when a skip prompt button is clicked
     *
     * @param interaction The button interaction
     * @returns when done
     */
    public async handleSkipPromptInteraction(interaction: ButtonInteraction): Promise<void> {
        const action = interaction.customId.split(':')[1];
        const channelId = interaction.customId.split(':')[2];

        let embed;

        const session = await SessionModel.findOne({ channelId: channelId }).exec();

        if (!session) {
            this.logger.error(
                `Couldn't find a session for ${channelId} on the skip prompt interaction (Action: ${action}.`
            );
            return;
        }

        if (action === SkipPromptActions.Skip) {
            this.logger.debug(`Skipping on ${interaction.customId}...`);
            const command: SessionNext = container.get('Next');
            const result = await command.runInternally(channelId);
            if (!result) {
                this.logger.error(`Failed to skip for channel id ${channelId}`);
                embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Error, {
                    title: `Skip Warning (failed)`,
                    content:
                        `**User**: ${session.currentTurn.name} (<@${session.currentTurn.userId}>)\n**Channel**: <#${session.channelId}>\n\n` +
                        `Failed to skip. Please skip them manually!`,
                });
                await this.messageService.editTimestamp(
                    session.channelId,
                    TimestampStatus.SkipFailed
                );
            } else {
                embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Success, {
                    title: `Skip Warning (skipped)`,
                    content:
                        `**User:** ${session.currentTurn.name} (<@${session.currentTurn.userId}>)\n**Channel:** <#${session.channelId}>\n\n` +
                        `User was skipped by <@${interaction.member.user.id}>.\nThe next person in the turn order for <#${channelId}> was notified.`,
                });
            }
        } else {
            this.logger.debug(`Dismissing ${interaction.customId}...`);
            embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Info, {
                title: `Skip Warning (dismissed)`,
                content:
                    `**User:** ${session.currentTurn.name} (<@${session.currentTurn.userId}>)\n**Channel:** <#${session.channelId}>\n\n` +
                    `The skip prompt was dismissed by <@${interaction.member.user.id}>.`,
            });
            await this.messageService.editTimestamp(
                session.channelId,
                TimestampStatus.SkipDismissed
            );
        }

        await interaction.update({ embeds: [embed], components: [] });
        this.logger.info(`Handled skip prompt interaction.`);
    }

    /**
     * Handles a button interaction on a timestamp post
     *
     * @param interaction The button interaction
     * @returns when done
     */
    public async handleTimestampInteraction(interaction: ButtonInteraction): Promise<void> {
        const action = interaction.customId.split(':')[1];
        const channelId = interaction.customId.split(':')[2];

        let content;
        if (action === TimestampActions.AdvanceTurn) {
            this.logger.info(`Received skip request from timestamp interaction. Skipping...`);
            const command: SessionNext = container.get('Next');
            await command.runInternally(channelId);
            content = await this.stringProvider.get('COMMAND.SESSION-NEXT.SUCCESS');
        } else if (action === TimestampActions.Finish) {
            this.logger.info(`Received finish request from timestamp interaction. Finishing...`);
            const command: SessionFinish = container.get('Finish');
            const session: ISessionSchema = await SessionModel.findOne({
                channelId: channelId,
            }).exec();
            await command.runInternally(session);
            content = await this.stringProvider.get('COMMAND.SESSION-FINISH.SUCCESS.POST-DELETED', [
                channelId,
            ]);
        }

        const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: content,
        });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        this.logger.info(`Handled timestamp post interaction.`);
    }
}
