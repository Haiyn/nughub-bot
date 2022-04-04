import { FeatureController } from '@controllers/feature/feature-controller';
import {
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
            const member = await this.userService.getGuildMemberById(hiatusEntry.userId);

            if (moment(hiatusEntry.expires).isBefore(moment().utc())) {
                this.logger.warn(
                    `Hiatus for (${member.user.username}) is orphaned: Ran out at ${moment(
                        hiatusEntry.expires
                    ).toDate()}`
                );
                continue;
            }

            const hiatus: Hiatus = {
                member: member,
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
            await this.finishHiatus(hiatus);
        };

        // Schedule the job
        this.scheduleService.scheduleJob(`hiatus:${hiatus.member.user.id}`, date, finishHiatus);
    }

    public async finishHiatus(hiatus: Hiatus): Promise<void> {
        this.logger.info(`Finishing hiatus for ${hiatus.member.user.username}...`);

        const currentTurnsForUser: ISessionSchema[] = await SessionModel.find({
            'currentTurn.userId': hiatus.member.user.id,
        })
            .sort({ lastTurnAdvance: 'ascending' })
            .exec();

        let hasOverdueReply = false;

        if (currentTurnsForUser && currentTurnsForUser?.length > 0) {
            this.logger.debug(
                `User ${hiatus.member.user.username} has ${currentTurnsForUser.length} pending replies. Handling...`
            );

            for (const session of currentTurnsForUser) {
                // see if any of the rescheduled reminders have become overdue
                const isOverdue = await this.reminderService.handleRemindersForHiatusFinish(
                    session
                );

                // Edit the timestamps
                if (isOverdue) {
                    hasOverdueReply = true;

                    // Edit the timestamp manually with a special status
                    await this.timestampService.editTimestamp(
                        session.channelId,
                        TimestampStatus.OverdueReminder,
                        undefined,
                        HiatusStatus.NoHiatus
                    );
                } else {
                    // Update timestamp
                    await this.timestampService.editTimestamp(
                        session.channelId,
                        undefined,
                        undefined,
                        HiatusStatus.NoHiatus
                    );
                }
            }
        }

        // Send welcome back message
        await this.hiatusService.sendWelcomeBackMessage(
            hiatus,
            currentTurnsForUser,
            hasOverdueReply
        );

        // Delete hiatus post
        this.logger.debug(`Deleting hiatus for ${hiatus.member.user.username}...`);
        await this.hiatusService.deleteHiatus(hiatus.hiatusPostId);
        await HiatusModel.findOneAndDelete({ userId: hiatus.member.user.id }).exec();

        this.logger.info(`Finished hiatus for ${hiatus.member.user.username}`);
    }
}
