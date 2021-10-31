import { IConfiguration } from '@models/configuration';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

export interface IService {
    readonly configuration: IConfiguration;
    readonly logger: Logger;
}

@injectable()
export class Service implements IService {
    readonly client: Client;
    readonly logger: Logger;
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
