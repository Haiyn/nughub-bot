import { Controller } from '@controllers/controller';
import { ConfigurationError } from '@models/config/configuration-error';
import { SessionModel } from '@models/data/session-schema';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { SessionFinish } from '@src/commands';
import container from '@src/inversify.config';
import { CommandError } from '@src/models';
import { EmbedProvider } from '@src/providers';
import { ChannelService, MessageService, PermissionService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles all incoming message events */
@injectable()
export class MessageController extends Controller {
    readonly messageService: MessageService;
    readonly permissionService: PermissionService;
    readonly channelService: ChannelService;
    readonly client: Client;
    readonly embedProvider: EmbedProvider;

    constructor(
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.PermissionService) permissionService: PermissionService,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ClientId) clientId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider
    ) {
        super(logger, clientId, token, configuration, embedProvider);
        this.messageService = messageService;
        this.permissionService = permissionService;
        this.channelService = channelService;
        this.client = client;
    }

    /**
     * Handles an incoming message deletion event, checks if the deleted message was a session post and
     * finishes the session if needed
     *
     * @param message The message that was deleted
     * @returns Resolves when done
     */
    async handleDeletion(message: Message): Promise<void> {
        if (message.author.id != this.client.user.id) {
            this.logger.trace(
                `Deleted message is not a bot message from the client (Author ID: ${message.author.id}, Client ID: ${this.client.user.id}).`
            );
            return;
        }

        const foundSession = await SessionModel.findOne({
            sessionPostId: message.id,
        }).exec();
        if (!foundSession) {
            this.logger.debug('Deleted bot message is not a session post.');
            return;
        }
        this.logger.debug('Session message was deleted. Removing session from database...');

        const command: SessionFinish = container.get('Finish');

        await command
            .runInternally(foundSession)
            .then(() => {
                this.logger.debug('Removed session from database.');
            })
            .catch((error) => {
                this.handleError(error, message);
            });

        return;
    }

    /**
     * Handles the caching of session messages in the sessions channel
     * so the messages can be recognized in the messageDeleted event
     *
     * @returns Resolves when cached
     */
    async handleCaching(): Promise<void> {
        try {
            const currentSessionsChannel = this.channelService.getTextChannelByChannelId(
                await this.configuration.getString('Channels_CurrentSessionsChannelId')
            );
            await currentSessionsChannel.messages.fetch().then((fetchedMessages) => {
                this.logger.debug(
                    `Fetched ${fetchedMessages.size} messages from currentSessionsChannel.`
                );
            });

            this.logger.debug('Fetching done.');
            return;
        } catch (error) {
            await this.handleError(error);
        }
    }

    /**
     * Handles all errors that can be thrown during a message handling
     *
     * @param error The error that was thrown
     * @param message Optional message if it failed on a certain message
     */
    private async handleError(error: unknown, message?: Message) {
        let internalMessage = message ? `Message ID ${message.id}: ` : '';
        if (error instanceof ConfigurationError) {
            // Configuration fetching failed
            internalMessage += `Configuration fetching failed: ${error.message}`;
        } else if (error instanceof CommandError) {
            internalMessage += `Failed while handling an internal command run: ${error.internalMessage}`;
        } else {
            internalMessage += `Unexpectedly failed while handling a message event: ${error}`;
        }

        this.logger.error(internalMessage);
    }
}
