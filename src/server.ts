import { Client, Message } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "./types";
import {MessageHandler} from "@services/message-handler";
import { Logger } from "tslog";

@injectable()
export class Server {
    private client: Client;
    private readonly token: string;
    private readonly messageHandler: MessageHandler;
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.MessageHandler) messageHandler: MessageHandler,
        @inject(TYPES.BaseLogger) logger: Logger
    ) {
        this.client = client;
        this.token = token;
        this.messageHandler = messageHandler;
        this.logger = logger
    }

    public listen(): Promise<string> {
        this.client.on('message', async (message: Message) => {
            this.logger.debug(`Message ID: ${message.id}: received\nAuthor ID: ${message.author.id}\nContent length: ${message.content.length}\nContent: ${message.content.substr(0, 100)}`);
            await this.messageHandler.handleMessage(message)
                .catch(error => {
                    this.logger.error("Could not handle message: " + error);
                    this.logger.prettyError(error);
                })
        });

        return this.client.login(this.token);
    }
}