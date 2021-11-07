import { ConfigurationProvider } from '@providers/configuration-provider';
import { HelperService } from '@services/index';
import { Service } from '@services/service';
import { TYPES } from '@src/types';
import { Client, TextChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles different functions in relation to the Discord Channel objects */
@injectable()
export class ChannelService extends Service {
    private readonly helperService: HelperService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.HelperService) helperService: HelperService
    ) {
        super(client, logger, configuration);
        this.helperService = helperService;
    }

    /**
     * Gets a TextChannel by a un-sanitized Discord ID (<#id>)
     *
     * @param dirtyId The un-sanitized ID
     * @returns The found text channel | null if not found
     */
    public getTextChannelByChannelId(dirtyId: string): TextChannel {
        const sanitizedChannelId = this.helperService.sanitizeDiscordId(dirtyId);
        if (!sanitizedChannelId) return null;

        const matchedChannel = this.client.channels.cache.get(sanitizedChannelId);
        if (!matchedChannel) {
            this.logger.warn(`Could not match a Discord channel for ID ${sanitizedChannelId}.`);
            return null;
        }
        if (!matchedChannel.isText()) {
            this.logger.warn(`Found channel for ID ${sanitizedChannelId} is not a text channel.`);
            return null;
        }
        return matchedChannel as TextChannel;
    }
}
