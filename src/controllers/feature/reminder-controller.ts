import { FeatureController } from '@controllers/feature/feature-controller';
import { Reminder } from '@models/jobs/reminder';
import { IReminderSchema, ReminderModel } from '@models/jobs/reminder-schema';
import { EmbedLevel, EmbedType, HiatusModel, TimestampStatus } from '@src/models';
import { injectable } from 'inversify';
import moment = require('moment');

/** Controls the logic of reminders */
@injectable()
export class ReminderController extends FeatureController {
    /**
     * Restores all active reminders from the Reminders collection in the Mongodb
     *
     * @returns The number of active reminders restored (excluding orphaned ones)
     */
    public async restoreRemindersFromDatabase(): Promise<number> {
        const activeReminders: IReminderSchema[] = await ReminderModel.find({}).exec();
        let restored = 0;

        for (const reminderEntry of activeReminders) {
            this.logger.debug(
                `Restoring reminder entry for Channel ID ${reminderEntry.channelId}...`
            );
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

            await this.scheduleReminder(reminder, true);
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
                    if (await this.hiatusService.userHasActiveHiatus(reminder.user.id)) {
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
                await this.timestampService.editTimestamp(
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
                            `${await this.hiatusService.getUserHiatusStatus(reminder.user.id)}`,
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
}
