import { ConfigurationProvider } from '@providers/configuration-provider';
import { EmbedProvider } from '@src/providers';
import { ChannelService, Service, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Services handle different reusable functions regarding Discord */
@injectable()
export class FeatureService extends Service {
    protected readonly embedProvider: EmbedProvider;
    protected readonly channelService: ChannelService;
    protected readonly userService: UserService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.UserService) userService: UserService
    ) {
        super(client, logger, configuration);
        this.embedProvider = embedProvider;
        this.channelService = channelService;
        this.userService = userService;
    }
}
