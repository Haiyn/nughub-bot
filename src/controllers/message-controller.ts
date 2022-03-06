import { Controller } from '@controllers/controller';
import { ConfigurationError } from '@models/config/configuration-error';
import { SessionModel } from '@models/data/session-schema';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { SessionFinish } from '@src/commands';
import container from '@src/inversify.config';
import { CommandError, ConfigurationKeys } from '@src/models';
import { EmbedProvider, PermissionProvider, StringProvider } from '@src/providers';
import { ChannelService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles all incoming message events */
@injectable()
export class MessageController extends Controller {
    readonly channelService: ChannelService;
    readonly stringProvider: StringProvider;

    constructor(
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.PermissionProvider) permissionProvider: PermissionProvider,
        @inject(TYPES.StringProvider) stringProvider: StringProvider
    ) {
        super(logger, guildId, token, client, configuration, embedProvider, permissionProvider);
        this.channelService = channelService;
        this.stringProvider = stringProvider;
    }

    /**
     * Handles an incoming message deletion event, checks if the deleted message was a session post and
     * finishes the session if needed
     *
     * @param message The message that was deleted
     * @returns Resolves when done
     */
    async handleDeletion(message: Message): Promise<void> {
        if (message.author?.id != this.client.user.id) {
            this.logger.trace(
                `Deleted message is not a bot message from the client (Author ID: ${message.author?.id}, Client ID: ${this.client.user.id}).`
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
            const channelsToFetchFrom = [
                this.channelService.getTextChannelByChannelId(
                    await this.configuration.getString(
                        ConfigurationKeys.Channels_CurrentSessionsChannelId
                    )
                ),
                this.channelService.getTextChannelByChannelId(
                    await this.configuration.getString(
                        ConfigurationKeys.Channels_CanonCharacterChannelId
                    )
                ),
                this.channelService.getTextChannelByChannelId(
                    await this.configuration.getString(
                        ConfigurationKeys.Channels_OriginalCharacterChannelId
                    )
                ),
            ];

            channelsToFetchFrom.forEach((channel) => {
                channel.messages.fetch().then((fetchedMessages) => {
                    this.logger.debug(
                        `Fetched ${fetchedMessages.size} messages from ${channel.name}.`
                    );
                });
            });

            this.logger.debug('Fetching done.');
            return;
        } catch (error) {
            await this.handleError(error);
        }
    }

    public async handleBotMention(message: Message): Promise<void> {
        this.logger.debug(`Found new bot mention.`);
        const quotes = await this.stringProvider.getList('SYSTEM.XENON.QUOTES');
        const position = Math.floor(Math.random() * quotes.length - 1);
        const reply = quotes[position];
        if (!reply) {
            this.logger.warn(
                `Could not fetch a quote with position ${position} at quotes length of ${quotes.length}`
            );
        } else {
            await message.channel.send({ content: reply });
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
