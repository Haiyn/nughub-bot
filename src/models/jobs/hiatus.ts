import { User } from 'discord.js';

export interface Hiatus {
    user: User;
    reason: string;
    expires?: Date;
    hiatusPostId?: string;
}
