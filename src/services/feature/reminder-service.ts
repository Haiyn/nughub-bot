import { Reminder } from '@models/jobs/reminder';
import { ReminderModel } from '@models/jobs/reminder-schema';
import { FeatureService } from '@services/feature/feature-service';
import { EmbedLevel, EmbedType, ISessionSchema } from '@src/models';
import { injectable } from 'inversify';
import moment = require('moment');

/** Handles different functions for reminders */
@injectable()
export class ReminderService extends FeatureService {
    /**
     * Sends a reminder message to the reminder channel
     *
     * @param reminder The reminder to send
     * @param hasActiveHiatus Whether or not the user has an active hiatus
     * @returns when done
     */
    public async sendReminder(reminder: Reminder, hasActiveHiatus: boolean): Promise<void> {
        this.logger.info(`Sending reminder ${reminder.name}...`);

        // Construct message
        let footer = '';
        let content = `*${reminder.characterName}* in <#${reminder.channel.id}>`;
        if (reminder.iteration === 0) {
            footer = await this.stringProvider.get('JOB.REMINDER.FOOTER.FIRST');
            if (hasActiveHiatus) {
                content +=
                    `\n\n` + (await this.stringProvider.get('JOB.REMINDER.DESCRIPTION.HIATUS'));
            }
        } else if (reminder.iteration === 1) {
            footer = await this.stringProvider.get('JOB.REMINDER.FOOTER.SECOND');
            content += await this.stringProvider.get('JOB.REMINDER.DESCRIPTION.SECOND');
            if (!hasActiveHiatus) {
                content += await this.stringProvider.get(
                    'JOB.REMINDER.DESCRIPTION.SECOND.HIATUS-HINT'
                );
            }
        }
        const message = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            title: await this.stringProvider.get('JOB.REMINDER.TITLE'),
            content: content,
            authorName: await this.userService.getEscapedDisplayName(reminder.member),
            authorIcon: reminder.member?.user?.avatarURL(),
            footer: footer,
        });

        // Get channel
        const reminderChannelId = await this.configuration.getString(
            'Channels_NotificationChannelId'
        );
        const channel = await this.channelService.getTextChannelByChannelId(reminderChannelId);

        // Send message to reminder channel
        try {
            await channel.send({
                content: `${await this.userService.getGuildMemberById(reminder.member?.id)}`,
                embeds: [message],
            });
            this.logger.info(
                `Successfully sent reminder #${reminder.iteration} for ${reminder.name}.`
            );
        } catch (error) {
            this.logger.error(
                `Failed to send reminder #${reminder.iteration} for ${reminder.name}: `,
                this.logger.prettyError(error)
            );
        }
    }

    /**
     * Sends a warning message to the mod channel that notifies mods about a last reminder being sent
     *
     * @param reminder the last reminder that was sent
     * @param hiatusStatus an additional hiatus status of the user that received the reminder
     */
    public async sendReminderWarning(reminder: Reminder, hiatusStatus: string): Promise<void> {
        const embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Warning, {
            title: await this.stringProvider.get('JOB.REMINDER.WARNING.TITLE'),
            content:
                `**User:** ${await this.userService.getMemberDisplay(
                    reminder.member
                )}\n**Channel:** <#${reminder.channel.id}>\n\n` + `${hiatusStatus}`,
        });

        await this.messageService.sendInternalMessage({ embeds: [embed] });
    }

    /**
     * Handles the reminder jobs when a hiatus was finished
     *
     * @param session The session in which the current turn user has finished a hiatus
     * @returns true if session is overdue, false otherwise
     */
    public async handleRemindersForHiatusFinish(session: ISessionSchema): Promise<boolean> {
        // Get the reminder
        const reminderModel = await ReminderModel.findOne({
            channelId: session.channelId,
        }).exec();
        if (!reminderModel) return true; // if there is no reminder in the database for this session, the reply is after the last reminder

        const reminderName = `reminder:${session.channelId}`;
        const reminderJob = this.scheduleService.getJob(reminderName);

        if (!reminderJob) {
            this.logger.warn(
                `Couldn't find reminder job ${reminderName} for current turn (${session.channelId}) while trying to assemble pending replies for Hiatus finish.`
            );
            return false;
        }

        // If user is not on first reminder, do nothing
        if (reminderModel.iteration === 0) return;

        // See if removing the hiatus extension would make the RP reply overdue
        const dateWithoutHiatusExtension = moment(new Date(new Date(reminderJob.nextInvocation())))
            .subtract(await this.configuration.getNumber('Schedule_Hiatus_Minutes'), 'minutes')
            .subtract(await this.configuration.getNumber('Schedule_Hiatus_Hours'), 'hours')
            .toDate();
        const today = moment().utc();

        if (today.isAfter(dateWithoutHiatusExtension)) {
            // User is overdue to reply, cancel the reminder job
            this.logger.debug(`${reminderJob.name} is overdue (${dateWithoutHiatusExtension})`);
            this.scheduleService.cancelJob(reminderJob.name);

            return true;
        } else {
            // User is not overdue to reply, reschedule the next reminder
            this.scheduleService.rescheduleJob(reminderJob.name, dateWithoutHiatusExtension);

            return false;
        }
    }
}
