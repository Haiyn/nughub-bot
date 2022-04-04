import { GuildMember } from 'discord.js';

export interface Hiatus {
    member: GuildMember;
    reason: string;
    expires?: Date;
    hiatusPostId?: string;
}
