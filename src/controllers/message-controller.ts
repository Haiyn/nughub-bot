import { Controller } from '@controllers/controller';
import { ConfigurationError } from '@models/config/configuration-error';
import { SessionModel } from '@models/data/session-schema';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { EmbedProvider } from '@src/providers';
import { ChannelService, MessageService, PermissionService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, Message, TextChannel } from 'discord.js';
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
     * Handles an incoming message deletion event and checks if the deleted message was a session post
     *
     * @param message The message that was deleted
     * @returns Resolves when deleted
     */
    async handleDeletion(message: Message): Promise<void> {
        // TODO: Refactor this
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
                        await this.configuration.getString('Channels_InternalChannelId')
                    );
                await this.channelService
                    .getTextChannelByChannelId(foundSessionPost.channelId)
                    .send({
                        embeds: [
                            await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Guild, {
                                content: '༺═──────────────═༻',
                            }),
                        ],
                    });
                await internalChannel.send({
                    embeds: [
                        await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Warning, {
                            title: 'Session post deleted',
                            content: `The session post for the session in <#${foundSessionPost.channelId}> was deleted. I have finished the session for you.`,
                        }),
                    ],
                });
                this.logger.debug('Removed session from database.');
                return;
            } catch (error) {
                this.logger.error(
                    `Failed to finish deleted session for channel ID ${foundSessionPost.channelId}.`
                );
                return;
            }
        } else {
            this.logger.trace(
                `Deleted message is not a bot message from the client (Author ID: ${message.author.id}, Client ID: ${this.client.user.id}).`
            );
            return;
        }
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

    private async handleError(error: unknown, message?: Message) {
        let internalMessage = message ? `Message ID ${message.id}: ` : '';
        if (error instanceof ConfigurationError) {
            // Configuration fetching failed
            internalMessage += `Configuration fetching failed: ${error.message}`;
        }

        this.logger.error(internalMessage);
    }
}
