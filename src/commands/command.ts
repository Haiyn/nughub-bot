import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { EmbedProvider, StringProvider } from '@src/providers';
import { ChannelService, HelperService, MessageService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** The implementation of an application command interaction */
@injectable()
export abstract class Command {
    /** The ts-log logger */
    protected readonly logger: Logger;

    /** The connected discord client */
    protected readonly client: Client;

    /** The persistent config */
    protected readonly configuration: ConfigurationProvider;

    /** The channel service */
    protected readonly channelService: ChannelService;

    /** The helper service */
    protected readonly helperService: HelperService;

    /** The message service */
    protected readonly messageService: MessageService;

    /** The user service */
    protected readonly userService: UserService;

    /** The string provider */
    protected readonly stringProvider: StringProvider;

    /** The embed provider */
    protected readonly embedProvider: EmbedProvider;

    /* The permission level of the command */
    public readonly permissionLevel: PermissionLevel;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.HelperService) helperService: HelperService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider
    ) {
        this.logger = logger;
        this.client = client;
        this.configuration = configuration;
        this.channelService = channelService;
        this.helperService = helperService;
        this.messageService = messageService;
        this.userService = userService;
        this.stringProvider = stringProvider;
        this.embedProvider = embedProvider;
    }

    /**
     * Executes the command
     *
     * @param interaction The received interaction
     * @returns The result of the command execution
     */
    abstract run(interaction: CommandInteraction): Promise<CommandResult>;

    /**
     * Validates the options that were passed together with the command
     *
     * @param options The command options
     * @returns Resolves if all options are valid
     */
    abstract validateOptions(options: CommandInteractionOptionResolver): Promise<void>;
}
