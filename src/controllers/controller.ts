import { IConfiguration } from '@models/configuration';
import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

export interface IController {
    readonly logger: Logger;
    readonly clientId: string;
    readonly token: string;
    configuration: IConfiguration;
}

@injectable()
export class Controller implements IController {
    readonly logger: Logger;
    readonly clientId: string;
    readonly token: string;
    configuration: IConfiguration;

    constructor(
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.ClientId) clientId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.Configuration) configuration: IConfiguration
    ) {
        this.logger = logger;
        this.clientId = clientId;
        this.token = token;
        this.configuration = configuration;
    }
}
