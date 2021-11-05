import { User } from 'discord.js';

/** The interface of a character object */
export interface ICharacter {
    user: User;
    name: string;
}

/** A RP character */
export class Character implements ICharacter {
    /** The Discord user that plays the character */
    public readonly user: User;

    /** The character name */
    public readonly name: string;

    constructor(user: User, name: string) {
        this.user = user;
        this.name = name;
    }
}
