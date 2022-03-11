import { Service } from '@services/service';
import { injectable } from 'inversify';
import { Job, RecurrenceRule, rescheduleJob, scheduledJobs, scheduleJob } from 'node-schedule';

/** Handles different functions in relation to the scheduling and time */
@injectable()
export class ScheduleService extends Service {
    /**
     * Schedules a certain job with node-schedule
     *
     * @param name The name of the job
     * @param date The date when the scheduled job should run
     * @param callback The callback function that should be called when the job runs
     */
    public scheduleJob(name: string, date: Date, callback: () => void): void {
        scheduleJob(name, date, callback);
        this.logger.debug(`Scheduled job (${name}) for ${date}`);
    }

    /**
     * Schedules a certain job with node-schedule
     *
     * @param name The name of the job
     * @param cron The cron date when the scheduled job should run
     * @param callback The callback function that should be called when the job runs
     */
    public scheduleRecurringJob(name: string, cron: RecurrenceRule, callback: () => void): void {
        cron.tz = 'Etc/UTC';
        const scheduledJob = scheduleJob(name, cron, callback);
        this.logger.debug(
            `Scheduled recurring job (${name}), next invocation at ${scheduledJob.nextInvocation()}`
        );
    }

    /**
     * Reschedules an existing job to another date
     *
     * @param name the name of the job to reschedule
     * @param date the new date
     */
    public rescheduleJob(name: string, date: Date): void {
        rescheduleJob(name, date);
        this.logger.debug(`Rescheduled job (${name}) to ${date}.`);
    }

    public getJob(name: string): Job | null {
        return scheduledJobs[name];
    }

    /**
     * Runs a specific job once
     *
     * @param name The name of the job that was run
     * @returns Whether the job was run or not
     */
    public runJob(name: string): boolean {
        const job = scheduledJobs[name];
        if (!job) {
            this.logger.warn(`Trying to run non-existent job (${name})`);
            return false;
        }
        this.logger.debug(`Running job (${name})...`);
        job.invoke();
        return true;
    }

    /**
     * Cancels a job internally
     *
     * @param name The name of the job to cancel
     * @returns Whether the job was cancelled or not
     */
    public cancelJob(name: string): boolean {
        const job = scheduledJobs[name];
        if (!job) {
            this.logger.warn(`Trying to cancel non-existent job (${name})`);
            return false;
        }
        this.logger.debug(`Cancelling job (${name})...`);
        job.cancel();
        return true;
    }

    /**
     * Checks if a job exists internally
     *
     * @param name The name of the job to look for
     * @returns exists
     */
    public jobExists(name: string): boolean {
        const job = scheduledJobs[name];
        // noinspection RedundantIfStatementJS
        if (!job) return false;
        else return true;
    }
}
