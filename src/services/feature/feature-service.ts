import { ConfigurationProvider } from '@providers/configuration-provider';
import { CharacterMapper } from '@src/mappers/character.mapper';
import { EmbedProvider, EmojiProvider, StringProvider } from '@src/providers';
import {
    ChannelService,
    MessageService,
    ScheduleService,
    Service,
    UserService,
} from '@src/services';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Services handle different reusable functions regarding Discord */
@injectable()
export class FeatureService extends Service {
    protected readonly embedProvider: EmbedProvider;
    protected readonly emojiProvider: EmojiProvider;
    protected readonly channelService: ChannelService;
    protected readonly userService: UserService;
    protected readonly stringProvider: StringProvider;
    protected readonly scheduleService: ScheduleService;
    protected readonly messageService: MessageService;
    protected readonly characterMapper: CharacterMapper;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.EmojiProvider) emojiProvider: EmojiProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.CharacterMapper) characterMapper: CharacterMapper
    ) {
        super(client, logger, configuration);
        this.embedProvider = embedProvider;
        this.emojiProvider = emojiProvider;
        this.channelService = channelService;
        this.userService = userService;
        this.stringProvider = stringProvider;
        this.scheduleService = scheduleService;
        this.messageService = messageService;
        this.characterMapper = characterMapper;
    }
}
