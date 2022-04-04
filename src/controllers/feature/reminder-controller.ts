import { FeatureController } from '@controllers/feature/feature-controller';
import { Reminder } from '@models/jobs/reminder';
import { IReminderSchema, ReminderModel } from '@models/jobs/reminder-schema';
import { TimestampStatus } from '@src/models';
import { injectable } from 'inversify';
import moment = require('moment');

/** Controls the logic of reminders */
@injectable()
export class ReminderController extends FeatureController {
    // region DATA PERSISTENCE

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

            switch (reminder.iteration) {
                case 0:
                    await this.scheduleFirstReminder(reminder);
                    break;
                case 1:
                    await this.scheduleSecondReminder(reminder);
                    break;
                default:
                    this.logger.error(
                        `No reminder mapping for reminder iteration ${reminder.iteration} on ${reminder.name}!`
                    );
            }
            restored++;
        }

        return restored;
    }

    /**
     * Adds a reminder to mongodb for persistence between restarts
     *
     * @param reminder The reminder to store
     * @returns true when successful, false otherwise
     */
    private async storeReminderInDatabase(reminder: Reminder): Promise<boolean> {
        //
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
            return true;
        } catch (error) {
            this.logger.error(`Failed to save to MongoDB: `, this.logger.prettyError(error));
            return false;
        }
    }

    /**
     * Deletes a reminder model from the db
     *
     * @param reminder the reminder to delete
     */
    private async deleteReminderFromDatabase(reminder: Reminder): Promise<void> {
        try {
            await ReminderModel.findOneAndDelete({
                channelId: reminder.channel.id,
            }).exec();
        } catch (error) {
            this.logger.error(
                `Failed to delete reminder from database for ${reminder.user.username} and channel ${reminder.channel.name}`
            );
        }
    }

    /**
     * Deletes a scheduled reminder job
     *
     * @param reminder the reminder job to delete
     */
    private async deleteReminderJob(reminder: Reminder): Promise<void> {
        // See if a previous reminder exists. If so, delete it
        if (this.scheduleService.jobExists(reminder.name)) {
            const success = this.scheduleService.cancelJob(reminder.name);
            if (!success)
                this.logger.error(
                    `Could not cancel reminder job for channel ${reminder.channel.name}!`
                );
        } else {
            this.logger.debug(
                `No reminder job for channel ${reminder.channel.name} that needs to be refreshed.`
            );
        }
    }

    // endregion

    // region SCHEDULING

    /**
     * Schedules a reminder internally
     *
     * @param reminder The reminder to schedule
     * @returns Resolves when done
     */
    public async scheduleFirstReminder(reminder: Reminder): Promise<void> {
        // Clean up old reminder (if there is one)
        await this.deleteReminderFromDatabase(reminder);
        await this.deleteReminderJob(reminder);

        // Create new reminder in database
        await this.storeReminderInDatabase(reminder);

        // Define the job action
        const handleReminderTrigger = async (): Promise<void> => {
            await this.handleFirstReminderTrigger(reminder);
            this.logger.info(
                `Finished first reminder trigger for ${reminder.user.username} and channel ${reminder.channel.name}.`
            );
        };

        // Schedule the job
        this.scheduleService.scheduleJob(reminder.name, reminder.date, handleReminderTrigger);

        this.logger.info(
            `Scheduled first reminder for ${reminder.user.username} and channel ${reminder.channel.name}.`
        );
    }

    public async scheduleSecondReminder(reminder: Reminder): Promise<void> {
        // Define the job action
        const handleReminderTrigger = async (): Promise<void> => {
            await this.handleSecondReminderTrigger(reminder);
            this.logger.info(
                `Finished second reminder trigger for ${reminder.user.username} and channel ${reminder.channel.name}.`
            );
        };

        // Schedule the job
        this.scheduleService.scheduleJob(reminder.name, reminder.date, handleReminderTrigger);

        this.logger.info(
            `Scheduled second reminder for ${reminder.user.username} and channel ${reminder.channel.name}.`
        );
    }

    private async handleFirstReminderTrigger(reminder: Reminder): Promise<void> {
        // Reminder is done, delete any jobs for this reminder
        await this.deleteReminderJob(reminder);

        // See if user is on hiatus
        const hasActiveHiatus = await this.hiatusService.userHasActiveHiatus(reminder.user.id);

        // Send the reminder message
        await this.reminderService.sendReminder(reminder, hasActiveHiatus);

        // Update the timestamp that the first reminder was sent
        await this.timestampService.editTimestamp(
            reminder.channel.id,
            TimestampStatus.FirstReminder
        );

        // Reschedule with the new time
        let newDate = moment()
            .utc()
            .add(await this.configuration.getNumber(`Schedule_Reminder_1_Hours`), 'hours')
            .add(await this.configuration.getNumber(`Schedule_Reminder_1_Minutes`), 'minutes');

        // Check if user is on hiatus
        if (hasActiveHiatus) {
            newDate = newDate
                .add(await this.configuration.getNumber(`Schedule_Hiatus_Hours`), 'hours')
                .add(await this.configuration.getNumber(`Schedule_Hiatus_Minutes`), 'minutes');
        }

        // Update in the database
        await this.deleteReminderFromDatabase(reminder);
        reminder.date = newDate.toDate();
        reminder.iteration = 1;
        await this.storeReminderInDatabase(reminder);

        // Schedule second reminder
        await this.scheduleSecondReminder(reminder);
    }

    /**
     * Handles the action that should run when the second reminder should trigger.
     * Deletes the reminder model and sends a warning in addition to the reminder message for the user.
     *
     * @param reminder The second reminder
     */
    private async handleSecondReminderTrigger(reminder: Reminder): Promise<void> {
        // Reminder is done, delete any jobs for this reminder
        await this.deleteReminderJob(reminder);

        // See if user is on hiatus
        const hasActiveHiatus = await this.hiatusService.userHasActiveHiatus(reminder.user.id);

        // Send the reminder message
        await this.reminderService.sendReminder(reminder, hasActiveHiatus);

        // Update the timestamp that the first reminder was sent
        await this.timestampService.editTimestamp(
            reminder.channel.id,
            TimestampStatus.SecondReminder
        );

        // notify mods
        const hiatusAddition = await this.hiatusService.getUserHiatusStatus(reminder.user.id); // Gets the hiatus status as an addition in the warning message
        await this.reminderService.sendReminderWarning(reminder, hiatusAddition);

        // Delete the reminder from the database because it no longer needs to be restored
        await this.deleteReminderFromDatabase(reminder);
    }

    // endregion
}
