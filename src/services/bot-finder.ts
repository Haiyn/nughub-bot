import {inject, injectable} from "inversify";
import {Message} from "discord.js";
import {Logger} from "tslog";
import {TYPES} from "@src/types";

@injectable()
export class BotFinder {
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger
    ) {
        this.logger = logger;
    }

    public isBot(message: Message): boolean {
        let isBot = message.author.bot;
        isBot ? this.logger.debug(`Message ID ${message.id}: is a bot message.`) : "";
        return isBot;
    }
}