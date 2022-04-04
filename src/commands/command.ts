import { CharacterController } from '@controllers/feature/character-controller';
import { HiatusController } from '@controllers/feature/hiatus-controller';
import { QotdController } from '@controllers/feature/qotd-controller';
import { ReminderController } from '@controllers/feature/reminder-controller';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { ConfigurationProvider } from '@providers/configuration-provider';
import {
    CharacterService,
    HiatusService,
    SessionService,
    TimestampService,
} from '@services/feature';
import { HiatusMapper } from '@src/mappers';
import { SessionMapper } from '@src/mappers/session.mapper';
import { EmbedProvider, EmojiProvider, StringProvider } from '@src/providers';
import {
    ChannelService,
    HelperService,
    InteractionService,
    MessageService,
    ScheduleService,
    UserService,
} from '@src/services';
import { TYPES } from '@src/types';
import { Client, CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** The implementation of an application command interaction */
@injectable()
export abstract class Command {
    public readonly permissionLevel: PermissionLevel;

    protected readonly logger: Logger;
    protected readonly client: Client;

    protected readonly hiatusController: HiatusController;
    protected readonly reminderController: ReminderController;
    protected readonly qotdController: QotdController;
    protected readonly characterController: CharacterController;

    protected readonly configuration: ConfigurationProvider;
    protected readonly embedProvider: EmbedProvider;
    protected readonly emojiProvider: EmojiProvider;
    protected readonly stringProvider: StringProvider;

    protected readonly channelService: ChannelService;
    protected readonly helperService: HelperService;
    protected readonly interactionService: InteractionService;
    protected readonly messageService: MessageService;
    protected readonly userService: UserService;
    protected readonly scheduleService: ScheduleService;
    protected readonly characterService: CharacterService;
    protected readonly hiatusService: HiatusService;
    protected readonly sessionService: SessionService;
    protected readonly timestampService: TimestampService;

    protected readonly sessionMapper: SessionMapper;
    protected readonly hiatusMapper: HiatusMapper;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.HiatusController) hiatusController: HiatusController,
        @inject(TYPES.ReminderController) reminderController: ReminderController,
        @inject(TYPES.QotdController) qotdController: QotdController,
        @inject(TYPES.CharacterController) characterController: CharacterController,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.EmojiProvider) emojiProvider: EmojiProvider,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.HelperService) helperService: HelperService,
        @inject(TYPES.InteractionService) interactionService: InteractionService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.CharacterService) characterService: CharacterService,
        @inject(TYPES.HiatusService) hiatusService: HiatusService,
        @inject(TYPES.SessionService) sessionService: SessionService,
        @inject(TYPES.TimestampService) timestampService: TimestampService,
        @inject(TYPES.SessionMapper) sessionMapper: SessionMapper,
        @inject(TYPES.HiatusMapper) hiatusMapper: HiatusMapper
    ) {
        this.logger = logger;
        this.client = client;
        this.hiatusController = hiatusController;
        this.reminderController = reminderController;
        this.qotdController = qotdController;
        this.characterController = characterController;
        this.configuration = configuration;
        this.embedProvider = embedProvider;
        this.emojiProvider = emojiProvider;
        this.stringProvider = stringProvider;
        this.channelService = channelService;
        this.helperService = helperService;
        this.interactionService = interactionService;
        this.userService = userService;
        this.scheduleService = scheduleService;
        this.messageService = messageService;
        this.characterService = characterService;
        this.hiatusService = hiatusService;
        this.sessionService = sessionService;
        this.timestampService = timestampService;
        this.sessionMapper = sessionMapper;
        this.hiatusMapper = hiatusMapper;
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
