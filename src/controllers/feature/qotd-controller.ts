import { FeatureController } from '@controllers/feature/feature-controller';
import { ConfigurationKeys, QuestionModel } from '@src/models';
import { injectable } from 'inversify';
import { RecurrenceRule } from 'node-schedule';

@injectable()
export class QotdController extends FeatureController {
    /**
     * Schedules a qotd at the next possible time
     *
     * @returns when done
     */
    public async scheduleQotd(): Promise<void> {
        const sendQotd = async (): Promise<void> => {
            await this.qotdService.sendQotd();
        };

        const hours = await this.configuration.getNumber(
            ConfigurationKeys.Schedule_QotdSendTime_Hours
        );

        // Set the cron job
        const recurrenceRule = new RecurrenceRule();
        recurrenceRule.second = 0;
        recurrenceRule.minute = 0;
        recurrenceRule.hour = hours;

        // Schedule the job
        this.scheduleService.scheduleRecurringJob('qotd', recurrenceRule, sendQotd);
    }

    /**
     * Tries to restore a qotd job on startup of the bot
     *
     * @returns the amount of qotds left
     */
    public async restoreQotdJobs(): Promise<number> {
        const remainingQotds = await QuestionModel.find({ used: false }).exec();
        await this.scheduleQotd();
        return remainingQotds.length;
    }
}
