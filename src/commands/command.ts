import { CommandResult } from '@models/commands/command-result';
import { IConfiguration } from '@models/configuration';
import { StringProvider } from '@src/providers';
import { ChannelService, HelperService, MessageService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export abstract class Command {
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

    /**
     * Executes the command
     *
     * @param {CommandInteraction} interaction The received interaction
     * @returns {Promise<CommandResult>} The result of the command execution
     */
    abstract run(interaction: CommandInteraction): Promise<CommandResult>;

    /**
     * Validates the options that were passed together with the command
     *
     * @param {CommandInteractionOptionResolver} options The command options
     * @returns {Promise<void>} Resolves if all options are valid
     */
    abstract validateOptions(options: CommandInteractionOptionResolver): Promise<void>;
}
