

import { inject, injectable } from "inversify";
import { Channel, Client, TextChannel } from "discord.js";
import { Logger } from "tslog";
import { TYPES } from "@src/types";
import { HelperService } from "@services/index";
import container from "@src/inversify.config";
import { Configuration } from "@models/configuration";

@injectable()
export class ChannelService {
    private readonly logger: Logger;
    private readonly client: Client;
    private readonly helperService: HelperService;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.HelperService) helperService: HelperService
    ) {
        this.logger = logger;
        this.client = client;
        this.helperService = helperService;
    }

    public getChannelByChannelId(dirtyId: string): Channel {
        const sanitizedChannelId = this.helperService.sanitizeDiscordId(dirtyId);
        if(!sanitizedChannelId) return null;

        const matchedChannel = this.client.channels.cache.get(sanitizedChannelId);
        if(!matchedChannel) {
            this.logger.warn(`Could not match a Discord channel for ID ${sanitizedChannelId}.`);
            return null;
        }
        return matchedChannel;
    }

    public getTextChannelByChannelId(dirtyId: string): TextChannel {
        const sanitizedChannelId = this.helperService.sanitizeDiscordId(dirtyId);
        if(!sanitizedChannelId) return null;

        const matchedChannel = this.client.channels.cache.get(sanitizedChannelId);
        if(!matchedChannel) {
            this.logger.warn(`Could not match a Discord channel for ID ${sanitizedChannelId}.`);
            return null;
        }
        if(!matchedChannel.isText()) {
            this.logger.warn(`Found channel for ID ${sanitizedChannelId} is not a text channel.`);
            return null;
        }
        return matchedChannel as TextChannel;
    }

    public isRpChannel(channelId: string): boolean {
        const rpChannelIds = container.get<Configuration>(TYPES.Configuration).rpChannelIds;
        return rpChannelIds.includes(channelId);
    }
}