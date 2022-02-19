import { User } from 'discord.js';

export interface Question {
    content: string;
    dateAdded: Date;
    used: boolean;
    submitter: User;
}
