import { ConfigurationProvider } from '@providers/configuration-provider';
import { ChannelService } from '@services/index';
import { Service } from '@services/service';
import { TYPES } from '@src/types';
import { Client, MessageOptions } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles different functions in relation to the Discord Message objects */
@injectable()
export class MessageService extends Service {
    private readonly channelService: ChannelService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService
    ) {
        super(client, logger, configuration);
        this.channelService = channelService;
    }

    /**
     * Sends a message to the internal channel
     *
     * @param message The message to send
     * @returns Resolves when done
     */
    public async sendInternalMessage(message: MessageOptions): Promise<void> {
        const internalChannelId = await this.configuration.getString('Channels_InternalChannelId');
        const channel = await this.channelService.getTextChannelByChannelId(internalChannelId);
        await channel.send(message);
    }
}
