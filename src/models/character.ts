import { User } from "discord.js";

export interface ICharacter {
    user: User,
    name: string,
}

export class Character implements ICharacter {
    public readonly user: User;
    public readonly name: string;

    constructor(user: User, name: string) {
        this.user = user;
        this.name = name;
    }
}