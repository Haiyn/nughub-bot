import { ConfigurationProvider } from '@providers/configuration-provider';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Services handle different reusable functions regarding Discord */
@injectable()
export class Service {
    /** The connected bot client */
    protected readonly client: Client;

    /** The ts-log logger */
    protected readonly logger: Logger;

    /** The persistent config */
    protected readonly configuration: ConfigurationProvider;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ServiceLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider
    ) {
        this.client = client;
        this.logger = logger;
        this.configuration = configuration;
    }
}
