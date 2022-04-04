import { FeatureController } from '@controllers/feature/feature-controller';
import { ReminderModel } from '@models/jobs/reminder-schema';
import {
    EmbedLevel,
    EmbedType,
    Hiatus,
    HiatusModel,
    HiatusStatus,
    IHiatusSchema,
    ISessionSchema,
    SessionModel,
    TimestampStatus,
} from '@src/models';
import { injectable } from 'inversify';
import moment = require('moment');

/** Controls the logic of hiatus */
@injectable()
export class HiatusController extends FeatureController {
    /**
     * Restores all active hiatus from the hiatus collection in the Mongodb
     *
     * @returns The number of active hiatus restored (excluding orphaned ones)
     */
    public async restoreHiatusFromDatabase(): Promise<number> {
        const allHiatus: IHiatusSchema[] = await HiatusModel.find().exec();
        const activeHiatus: IHiatusSchema[] = allHiatus.filter(
            (hiatus) => hiatus.expires !== undefined
        );
        let restored = 0;

        for (const hiatusEntry of activeHiatus) {
            this.logger.debug(`Restoring hiatus entry for User ID ${hiatusEntry.userId}...`);
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

        return Promise.resolve(restored);
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
                        await this.timestampService.editTimestamp(
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

                        await this.timestampService.editTimestamp(
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
            await this.hiatusService.deleteHiatus(hiatus.hiatusPostId);
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
}
