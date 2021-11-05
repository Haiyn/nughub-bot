import { IConfiguration } from '@models/configuration';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

export interface IService {
    readonly configuration: IConfiguration;
    readonly logger: Logger;
}

/** Services handle different reusable functions regarding Discord */
@injectable()
export class Service implements IService {
    /** The connected bot client */
    readonly client: Client;

    /** The ts-log logger */
    readonly logger: Logger;

    /** The persistent configuration */
    configuration: IConfiguration;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ServiceLogger) logger: Logger,
        @inject(TYPES.Configuration) configuration: IConfiguration
    ) {
        this.client = client;
        this.logger = logger;
        this.configuration = configuration;
    }
}
