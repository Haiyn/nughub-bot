import { Client, Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { TYPES } from '@src/types';
import { MessageController } from '@controllers/index';
import { Logger } from 'tslog';

@injectable()
export class Server {
    private client: Client;
    private readonly token: string;
    private readonly messageController: MessageController;
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.MessageController) messageController: MessageController,
        @inject(TYPES.BaseLogger) logger: Logger
    ) {
        this.client = client;
        this.token = token;
        this.messageController = messageController;
        this.logger = logger;
    }

    public listen(): Promise<string> {
        this.client.on('messageCreate', async (message: Message) => {
            this.logger.trace(
                `Message ID ${message.id}: received\nAuthor ID: ${
                    message.author.id
                }\nContent length: ${message.content.length}\nContent: ${message.content.substr(
                    0,
                    100
                )}`
            );
            await this.messageController.handleMessage(message);
        });

        this.client.on('messageDelete', async (message: Message) => {
            this.logger.trace(
                `Message ID ${message.id} deleted\nAuthor ID: ${
                    message.author.id
                }\nContent length: ${message.content.length}\nContent: ${message.content.substr(
                    0,
                    100
                )}`
            );
            await this.messageController.handleDeletion(message);
        });

        this.client.on('ready', async () => {
            this.logger.info('Client is ready. Caching vital messages...');
            await this.messageController.handleCaching();
            this.logger.info('Caching done.');
        });

        return this.client.login(this.token);
    }
}
