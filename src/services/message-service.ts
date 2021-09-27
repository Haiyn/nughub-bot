import { injectable } from "inversify";
import { Message } from "discord.js";
import { Service } from "@services/service";

@injectable()
export class MessageService extends Service {

    public isBotMessage(message: Message): boolean {
        const isBot = message.author.bot;
        isBot ? this.logger.debug(`Message ID ${message.id}: is a bot message.`) : "";
        return isBot;
    }

    public isPrefixedMessage(message: Message): boolean {
        const isPrefixed = message.content.startsWith(this.configuration.guild.prefix);
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