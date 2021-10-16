import { inject, injectable } from 'inversify';
import { Client } from 'discord.js';
import { Logger } from 'tslog';
import { TYPES } from '@src/types';
import { IConfiguration } from '@models/configuration';
import { ChannelService, CommandService, MessageService, PermissionService } from '@src/services';

export interface IController {
    readonly messageService: MessageService;
    readonly permissionService: PermissionService;
    readonly commandService: CommandService;
    readonly channelService: ChannelService;
    readonly logger: Logger;
    readonly client: Client;
    configuration: IConfiguration;
}

@injectable()
export class Controller implements IController {
    readonly messageService: MessageService;
    readonly permissionService: PermissionService;
    readonly commandService: CommandService;
    readonly channelService: ChannelService;
    readonly logger: Logger;
    readonly client: Client;
    configuration: IConfiguration;

    constructor(
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.PermissionService) permissionService: PermissionService,
        @inject(TYPES.CommandService) commandService: CommandService,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Configuration) configuration: IConfiguration
    ) {
        this.messageService = messageService;
        this.permissionService = permissionService;
        this.commandService = commandService;
        this.channelService = channelService;
        this.logger = logger;
        this.client = client;
        this.configuration = configuration;
    }
}
