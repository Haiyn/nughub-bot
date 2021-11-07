import { ConfigurationProvider } from '@providers/configuration-provider';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

export interface IService {
    readonly configuration: ConfigurationProvider;
    readonly logger: Logger;
}

/** Services handle different reusable functions regarding Discord */
@injectable()
export class Service implements IService {
    /** The connected bot client */
    readonly client: Client;

    /** The ts-log logger */
    readonly logger: Logger;

    /** The persistent config */
    configuration: ConfigurationProvider;

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
