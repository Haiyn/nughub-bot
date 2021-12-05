import { TextChannel, User } from 'discord.js';

/** The interface of a reminder job object */
export interface IReminder {
    name: string;
    user: User;
    characterName: string;
    date: Date;
    channel: TextChannel;
    iteration: number;
}

/** A Reminder job */
export class Reminder implements IReminder {
    /** The internal name of the reminder, used to find it again */
    public readonly name: string;

    /** The Discord user that receives the reminder */
    public readonly user: User;

    /** The character that needs to reply */
    public readonly characterName: string;

    /** The date for which the reminder is scheduled for */
    public date: Date;

    /** The channel for which the reminder is schedules for  */
    public readonly channel: TextChannel;

    /** The iteration number, how many reminders have already been sent  */
    public iteration: number;

    constructor(
        name: string,
        user: User,
        characterName: string,
        date: Date,
        channel: TextChannel,
        iteration: number
    ) {
        this.name = name;
        this.user = user;
        this.characterName = characterName;
        this.date = date;
        this.channel = channel;
        this.iteration = iteration;
    }
}
