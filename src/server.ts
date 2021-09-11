import { Client, Message } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "@src/types";
import { MessageController } from "@controllers/index";
import { Logger } from "tslog";

@injectable()
export class Server {
    private client: Client;
    private readonly token: string;
    private readonly messageHandler: MessageController;
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.MessageController) messageHandler: MessageController,
        @inject(TYPES.BaseLogger) logger: Logger
    ) {
        this.client = client;
        this.token = token;
        this.messageHandler = messageHandler;
        this.logger = logger;
    }

    public listen(): Promise<string> {
        this.client.on("messageCreate", async (message: Message) => {
            this.logger.trace(`Message ID ${message.id}: received\nAuthor ID: ${message.author.id}\nContent length: ${message.content.length}\nContent: ${message.content.substr(0, 100)}`);
            await this.messageHandler.handleMessage(message);
        });

        return this.client.login(this.token);
    }
}