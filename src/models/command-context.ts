import {Message, User} from "discord.js";

export class CommandContext {
    readonly parsedCommandName: string;
    readonly args: string[];
    readonly originalMessage: Message;
    readonly author: User;

    constructor(
        message: Message
    ) {
        const splitMessage = message.content
            .slice(process.env.PREFIX.length)
            .trim()
            .split(/ +/g);

        this.author = message.author;
        this.parsedCommandName = splitMessage.shift()!.toLowerCase();
        this.args = splitMessage;
        this.originalMessage = message;
    }
}