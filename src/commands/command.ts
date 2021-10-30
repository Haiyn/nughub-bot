import { inject, injectable } from 'inversify';
import { Client } from 'discord.js';
import { Logger } from 'tslog';
import { TYPES } from '@src/types';
import { CommandContext } from '@models/command-context';
import { CommandResult } from '@models/command-result';
import { ChannelService, HelperService, MessageService, UserService } from '@services/index';
import { IConfiguration } from '@models/configuration';
import { StringProvider } from '@src/providers';

export interface ICommand {
    readonly names: string[];
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number;
    readonly logger: Logger;
    readonly configuration: IConfiguration;

    getHelpMessage(): string;
    run(context: CommandContext): Promise<CommandResult>;
}

@injectable()
export class Command implements ICommand {
    readonly names: string[];
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number = 0;

    readonly logger: Logger;
    readonly client: Client;
    readonly configuration: IConfiguration;
    readonly channelService: ChannelService;
    readonly helperService: HelperService;
    readonly messageService: MessageService;
    readonly userService: UserService;
    readonly stringProvider: StringProvider;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Configuration) configuration: IConfiguration,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.HelperService) helperService: HelperService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.StringProvider) stringProvider: StringProvider
    ) {
        this.logger = logger;
        this.client = client;
        this.configuration = configuration;
        this.channelService = channelService;
        this.helperService = helperService;
        this.messageService = messageService;
        this.userService = userService;
        this.stringProvider = stringProvider;
    }

    public getHelpMessage(): string {
        return this.description + '\n' + "Usage: '" + this.usageHint + "'";
    }

    public run(context: CommandContext): Promise<CommandResult> {
        return Promise.resolve(new CommandResult(this, context, false, 'not implemented.'));
    }

    public validateArguments(args: string[]): unknown | string {
        return args;
    }
}
