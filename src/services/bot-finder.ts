import {injectable} from "inversify";
import {Message} from "discord.js";

@injectable()
export class BotFinder {
    public isBot(message: Message): boolean {
        return message.author.bot;
    }
}