import { IConfiguration } from '@models/configuration';
import { HelperService } from '@services/index';
import { Service } from '@services/service';
import { TYPES } from '@src/types';
import { Client, TextChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class ChannelService extends Service {
    private readonly helperService: HelperService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Configuration) configuration: IConfiguration,
        @inject(TYPES.HelperService) helperService: HelperService
    ) {
        super(client, logger, configuration);
        this.helperService = helperService;
    }

    /**
     * Gets a TextChannel by a un-sanitized Discord ID (<#id>)
     *
     * @param {string} dirtyId The un-sanitized ID
     * @returns {TextChannel} The found text channel | null if not found
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

    /**
     * Checks if the passed channel ID is registered as as valid RP channel
     *
     * @param {string} channelId The channel ID to check
     * @returns {boolean} Whether or not the channel is an RP channel
     */
    public isRpChannel(channelId: string): boolean {
        const rpChannelIds = this.configuration.channels.rpChannelIds;
        return rpChannelIds.includes(channelId);
    }
}
