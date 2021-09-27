

import { inject, injectable } from "inversify";
import { Channel, Client, TextChannel } from "discord.js";
import { Logger } from "tslog";
import { TYPES } from "@src/types";
import { HelperService } from "@services/index";
import { IConfiguration } from "@models/configuration";
import { Service } from "@services/service";

@injectable()
export class ChannelService extends Service{
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
        const rpChannelIds = this.configuration.channels.rpChannelIds;
        return rpChannelIds.includes(channelId);
    }
}