import { ConfigurationProvider, EmbedProvider } from '@src/providers';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Controllers handle all Discord events */
@injectable()
export class Controller {
    /* The ts-log logger */
    readonly logger: Logger;

    /* The guild ID where the bot is used */
    readonly guildId: string;

    /* The token of the bot */
    readonly token: string;

    /* The bot client */
    readonly client: Client;

    /** The persistent config */
    configuration: ConfigurationProvider;

    /** The embed provider for replying */
    embedProvider: EmbedProvider;

    constructor(
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider
    ) {
        this.logger = logger;
        this.guildId = guildId;
        this.token = token;
        this.client = client;
        this.configuration = configuration;
        this.embedProvider = embedProvider;
    }
}
