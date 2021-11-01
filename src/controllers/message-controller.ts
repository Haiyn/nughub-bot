import { Controller } from '@controllers/controller';
import { IConfiguration } from '@models/configuration';
import { SessionModel } from '@models/data/session-schema';
import { ChannelService, MessageService, PermissionService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, Message, TextChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class MessageController extends Controller {
    readonly messageService: MessageService;
    readonly permissionService: PermissionService;
    readonly channelService: ChannelService;
    readonly client: Client;

    constructor(
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.PermissionService) permissionService: PermissionService,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ClientId) clientId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.Configuration) configuration: IConfiguration
    ) {
        super(logger, clientId, token, configuration);
        this.messageService = messageService;
        this.permissionService = permissionService;
        this.channelService = channelService;
        this.client = client;
    }

    /**
     * Handles an incoming message deletion event and checks if the deleted message was a session post
     *
     * @param {Message} message The message that was deleted
     * @returns {Promise<void>} Resolves when deleted
     */
    async handleDeletion(message: Message): Promise<void> {
        if (message.author.id == this.client.user.id) {
            const foundSessionPost = await SessionModel.findOne({
                sessionPostId: message.id,
            }).exec();
            if (!foundSessionPost) {
                this.logger.debug('Deleted bot message is not a session post.');
                return;
            }
            try {
                this.logger.debug('Session message was deleted. Removing session from database...');
                await SessionModel.findOneAndDelete({ sessionPostId: message.id }).exec();
                const internalChannel: TextChannel =
                    await this.channelService.getTextChannelByChannelId(
                        this.configuration.channels.internalChannelId
                    );
                await this.channelService
                    .getTextChannelByChannelId(foundSessionPost.channelId)
                    .send('```⋟────────────────────────⋞```');
                await internalChannel.send(
                    `The session post for the session in <#${foundSessionPost.channelId}> was deleted. I have finished the session for you.`
                );
                this.logger.debug('Removed session from database.');
                return;
            } catch (error) {
                this.logger.error(
                    `Failed to finish deleted session for channel ID ${foundSessionPost.channelId}.`
                );
                return;
            }
        } else {
            this.logger.debug(
                `Deleted message is not a bot message from the client (Author ID: ${message.author.id}, Client ID: ${this.client.user.id}).`
            );
            return;
        }
    }

    /**
     * Handles the caching of session messages in the sessions channel
     *
     * @returns {Promise<void>} Resolves when cached
     */
    async handleCaching(): Promise<void> {
        const currentSessionsChannel = this.channelService.getTextChannelByChannelId(
            this.configuration.channels.currentSessionsChannelId
        );
        await currentSessionsChannel.messages.fetch().then((fetchedMessages) => {
            this.logger.debug(
                `Fetched ${fetchedMessages.size} messages from currentSessionsChannel.`
            );
        });

        this.logger.debug('Fetching done.');
        return;
    }
}
