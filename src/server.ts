import { CharacterController } from '@controllers/feature/character-controller';
import { HiatusController } from '@controllers/feature/hiatus-controller';
import { QotdController } from '@controllers/feature/qotd-controller';
import { ReminderController } from '@controllers/feature/reminder-controller';
import { InteractionController, MessageController } from '@controllers/index';
import container from '@src/inversify.config';
import { TYPES } from '@src/types';
import { Client, Guild, Interaction, Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** The server is the main entry point for the bot to connect and subscribe to events */
@injectable()
export class Server {
    private client: Client;
    private readonly token: string;
    private readonly logger: Logger;
    private readonly messageController: MessageController;
    private readonly interactionController: InteractionController;
    private readonly qotdController: QotdController;
    private readonly characterController: CharacterController;
    private readonly reminderController: ReminderController;
    private readonly hiatusController: HiatusController;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.MessageController) messageController: MessageController,
        @inject(TYPES.InteractionController) interactionController: InteractionController,
        @inject(TYPES.ReminderController) reminderController: ReminderController,
        @inject(TYPES.HiatusController) hiatusController: HiatusController,
        @inject(TYPES.QotdController) qotdController: QotdController,
        @inject(TYPES.CharacterController)
        characterController: CharacterController
    ) {
        this.client = client;
        this.token = token;
        this.logger = logger;
        this.messageController = messageController;
        this.interactionController = interactionController;
        this.reminderController = reminderController;
        this.hiatusController = hiatusController;
        this.qotdController = qotdController;
        this.characterController = characterController;
    }

    /**
     * The main listen instruction for the bot.
     * Defines which events to listen to and routes event data to the controllers
     *
     * @returns Successful or not
     */
    public listen(): Promise<string> {
        /** Bot joined new guild, refresh the state */
        this.client.on('guildCreate', async (guild: Guild) => {
            this.logger.trace(`New Guild join event: ${guild.id} - ${guild.name}`);
            await this.readyRoutine();
        });

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
            if (
                message.content.startsWith(`<@${this.client.user.id}>`) ||
                message.content.startsWith(`<@!${this.client.user.id}>`)
            ) {
                await this.messageController.handleBotMention(message);
            }
        });

        /** A cached discord message was deleted */
        this.client.on('messageDelete', async (message: Message) => {
            this.logger.trace(
                `Message ID ${message.id} deleted\nAuthor ID: ${
                    message.author?.id
                }\nContent length: ${message.content?.length}\nContent: ${message.content?.substr(
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
            await this.readyRoutine();
        });

        return this.client.login(this.token);
    }

    public async readyRoutine(): Promise<void> {
        this.logger.info('Client is ready. Caching vital messages...');
        await this.messageController
            .handleCaching()
            .then(() => {
                this.logger.info('Caching done.');
            })
            .catch((error) => {
                this.logger.error(`Failed to cache messages: `, this.logger.prettyError(error));
            });

        if (container.get(TYPES.Environment) !== 'local') {
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
        } else {
            this.logger.info(`Skipping command registration because Environment is 'local'.`);
        }

        this.logger.info('Restoring active reminders from database...');
        await this.reminderController
            .restoreRemindersFromDatabase()
            .then((result) => {
                this.logger.info(`Restored ${result} reminders.`);
            })
            .catch(() => {
                this.logger.warn(`Could not restore reminders.`);
            });

        this.logger.info('Restoring active hiatus finish events from database...');
        await this.hiatusController
            .restoreHiatusFromDatabase()
            .then((result) => {
                this.logger.info(`Restored ${result} hiatus finish events.`);
            })
            .catch((error) => {
                this.logger.warn(`Could not restore hiatus finish events.`);
                this.logger.prettyError(error);
            });

        this.logger.info('Restoring qotd job...');
        await this.qotdController
            .restoreQotdJobs()
            .then((result) => {
                result === -1
                    ? this.logger.info(`No qotds left to restore.`)
                    : this.logger.info(`Restored qotd job, ${result} qotds left.`);
            })
            .catch((error) => {
                this.logger.error(`Could not restore qotd job.`);
                this.logger.prettyError(error);
            });

        this.logger.info('Initializing character lists...');
        await this.characterController
            .initializeCharacterChannels()
            .then(() => {
                this.logger.info(`Successfully initialized character lists.`);
            })
            .catch((error) => {
                this.logger.error(`Could not initialize character lists.`);
                this.logger.prettyError(error);
            });
    }
}
