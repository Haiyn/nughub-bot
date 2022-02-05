import { JobRuntimeController } from '@controllers/job-runtime-controller';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { EmbedProvider, EmojiProvider, StringProvider } from '@src/providers';
import { ChannelService, HelperService, InteractionService, UserService } from '@src/services';
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

    /** The interaction service */
    protected readonly interactionService: InteractionService;

    /** The interaction service */
    protected readonly messageService: MessageService;

    /** The user service */
    protected readonly userService: UserService;

    /** The schedule service */
    protected readonly scheduleService: ScheduleService;

    /** The string provider */
    protected readonly stringProvider: StringProvider;

    /** The job runtime controller */
    protected readonly jobRuntime: JobRuntimeController;

    /** The embed provider */
    protected readonly embedProvider: EmbedProvider;

    /** The emoji provider */
    protected readonly emojiProvider: EmojiProvider;

    /* The permission level of the command */
    public readonly permissionLevel: PermissionLevel;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.HelperService) helperService: HelperService,
        @inject(TYPES.InteractionService) interactionService: InteractionService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.EmojiProvider) emojiProvider: EmojiProvider,
        @inject(TYPES.JobRuntimeController) jobRuntime: JobRuntimeController
    ) {
        this.logger = logger;
        this.client = client;
        this.configuration = configuration;
        this.channelService = channelService;
        this.helperService = helperService;
        this.interactionService = interactionService;
        this.userService = userService;
        this.scheduleService = scheduleService;
        this.messageService = messageService;
        this.stringProvider = stringProvider;
        this.embedProvider = embedProvider;
        this.emojiProvider = emojiProvider;
        this.jobRuntime = jobRuntime;
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
