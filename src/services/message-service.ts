import { inject, injectable } from "inversify";
import { Message } from "discord.js";
import { Logger } from "tslog";
import { TYPES } from "@src/types";
import container from "@src/inversify.config";
import { Configuration } from "@models/configuration";

@injectable()
export class MessageService {
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger
    ) {
        this.logger = logger;
    }

    public isBotMessage(message: Message): boolean {
        const isBot = message.author.bot;
        isBot ? this.logger.debug(`Message ID ${message.id}: is a bot message.`) : "";
        return isBot;
    }

    public isPrefixedMessage(message: Message): boolean {
        const isPrefixed = message.content.startsWith(container.get<Configuration>(TYPES.Configuration).prefix);
        this.logger.debug(`Message ID ${message.id}: is ${isPrefixed ? "" : "not"} prefixed.`);
        return isPrefixed;
    }

    public async deleteMessages(messagesToDelete: Message[], timeout?: number): Promise<boolean> {
        try {
            setTimeout(() => {
                messagesToDelete.forEach(message => {
                    message.delete();
                });
            }, timeout ? timeout : 0);
            return Promise.resolve(true);
        } catch(error) {
            this.logger.error("Failed to delete user prompts: ", this.logger.prettyError(error));
            return Promise.resolve(false);
        }
    }
}