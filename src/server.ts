import { InteractionController, MessageController } from '@controllers/index';
import { TYPES } from '@src/types';
import { Client, Interaction, Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** The server is the main entry point for the bot to connect and subscribe to events */
@injectable()
export class Server {
    /** The discord client */
    private client: Client;

    /** The bot token */
    private readonly token: string;

    /** The ts-log logger */
    private readonly logger: Logger;

    /** The message controller that handles all message events */
    private readonly messageController: MessageController;

    /** The interaction controller that handles all interaction events */
    private readonly interactionController: InteractionController;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.MessageController) messageController: MessageController,
        @inject(TYPES.InteractionController) interactionController: InteractionController
    ) {
        this.client = client;
        this.token = token;
        this.logger = logger;
        this.messageController = messageController;
        this.interactionController = interactionController;
    }

    /**
     * The main listen instruction for the bot.
     * Defines which events to listen to and routes event data to the controllers
     *
     * @returns Successful or not
     */
    public listen(): Promise<string> {
        /** A new message was created */
        this.client.on('messageCreate', async (message: Message) => {
            this.logger.trace(
                `Message ID ${message.id}: received\nAuthor ID: ${
                    message.author.id
                }\nContent length: ${message.content.length}\nContent: ${message.content.substr(
                    0,
                    100
                )}`
            );
        });

        /** A cached discord message was deleted */
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

        /** An interaction is created */
        this.client.on('interactionCreate', async (interaction: Interaction) => {
            this.logger.trace(
                `Interaction ID ${interaction.id} created\nCreator: ${interaction.member}\nType: ${interaction.type}`
            );
            await this.interactionController.handleInteraction(interaction).catch((error) => {
                this.logger.error(`Failed: `, this.logger.prettyError(error));
            });
        });

        /** The client logged in and is ready to communicate */
        this.client.on('ready', async () => {
            this.logger.info('Client is ready. Caching vital messages...');
            await this.messageController
                .handleCaching()
                .then(() => {
                    this.logger.info('Caching done.');
                })
                .catch((error) => {
                    this.logger.error(`Failed to cache messages: `, this.logger.prettyError(error));
                });
            this.logger.info('Registering application commands...');
            await this.interactionController
                .registerApplicationCommands()
                .then((result) => {
                    this.logger.info(`Registered ${result} interactions.`);
                })
                .catch(() => {
                    process.exit(1);
                });
            this.logger.info('Registering application command permissions...');
            await this.interactionController
                .registerApplicationCommandPermissions()
                .then(() => {
                    this.logger.info(`Registered application command permissions.`);
                })
                .catch(() => {
                    process.exit(1);
                });
        });

        return this.client.login(this.token);
    }
}
