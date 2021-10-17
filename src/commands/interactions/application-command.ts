import { ApplicationCommandResult } from '@src/interfaces/application-command-result.interface';
import { inject, injectable } from 'inversify';
import { Client, CommandInteraction } from 'discord.js';
import { TYPES } from '@src/types';
import { IConfiguration } from '@models/configuration';
import { Logger } from 'tslog';
import { ChannelService, HelperService, MessageService, UserService } from '@src/services';

@injectable()
export abstract class ApplicationCommand implements ApplicationCommand {
    readonly logger: Logger;
    readonly client: Client;
    readonly configuration: IConfiguration;
    readonly channelService: ChannelService;
    readonly helperService: HelperService;
    readonly messageService: MessageService;
    readonly userService: UserService;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Configuration) configuration: IConfiguration,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.HelperService) helperService: HelperService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.UserService) userService: UserService
    ) {
        this.logger = logger;
        this.client = client;
        this.configuration = configuration;
        this.channelService = channelService;
        this.helperService = helperService;
        this.messageService = messageService;
        this.userService = userService;
    }

    abstract run(interaction: CommandInteraction): Promise<ApplicationCommandResult>;
}
