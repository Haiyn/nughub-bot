import { GuildMember } from 'discord.js';

/** The interface of a character object */
export interface ICharacter {
    member: GuildMember;
    name: string;
}

/** A RP character */
export class Character implements ICharacter {
    /** The Discord user that plays the character */
    public readonly member: GuildMember;

    /** The character name */
    public readonly name: string;

    constructor(member: GuildMember, name: string) {
        this.member = member;
        this.name = name;
    }
}
