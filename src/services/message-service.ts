import { inject, injectable } from "inversify";
import { Message } from "discord.js";
import { Logger } from "tslog";
import { TYPES } from "@src/types";

@injectable()
export class MessageService {
    private readonly prefix: string;
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.Prefix) prefix: string,
        @inject(TYPES.ServiceLogger) logger: Logger
    ) {
        this.logger = logger;
        this.prefix = prefix;
    }

    public isBotMessage(message: Message): boolean {
        const isBot = message.author.bot;
        isBot ? this.logger.debug(`Message ID ${message.id}: is a bot message.`) : "";
        return isBot;
    }

    public isPrefixedMessage(message: Message): boolean {
        const isPrefixed = message.content.startsWith(this.prefix);
        this.logger.debug(`Message ID ${message.id}: is ${isPrefixed ? "" : "not"} prefixed.`);
        return isPrefixed;
    }
}