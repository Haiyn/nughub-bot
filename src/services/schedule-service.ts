import { Service } from '@services/service';
import { injectable } from 'inversify';
import { scheduledJobs, scheduleJob } from 'node-schedule';

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
        scheduleJob(name, this.dateToCron(date), callback);
        this.logger.debug(`Scheduled job (${name}) for ${date}`);
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
        if (!job) return false;
        else return true;
    }

    /**
     * Converts a unix timestamp to a Date object
     *
     * @param unixTimestamp The unix time to convert
     * @returns The converted date
     */
    public unixToDate(unixTimestamp: number): Date {
        // Create a new JavaScript Date object based on the timestamp
        // multiplied by 1000 so that the argument is in milliseconds, not seconds.
        const date = new Date(unixTimestamp * 1000);
        this.logger.trace(`Converted unix (${unixTimestamp}) to Date (${date})`);
        return date;
    }

    /**
     * Converts a date object to a cron object
     *
     * @param date The date object to convert
     * @returns The cron object (string)
     */
    public dateToCron(date: Date): string {
        const minutes = date.getMinutes();
        const hours = date.getHours();
        const days = date.getDate();
        const months = date.getMonth() + 1;
        const weekday = date.getDay();

        const cron = `${minutes} ${hours} ${days} ${months} ${weekday}`;

        this.logger.trace(`Converted date (${date}) to cron (${cron})`);

        return cron;
    }
}
