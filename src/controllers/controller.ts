import { ConfigurationProvider } from '@providers/configuration-provider';
import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

export interface IController {
    readonly logger: Logger;
    readonly clientId: string;
    readonly token: string;
    readonly configuration: ConfigurationProvider;
}

/** Controllers handle all Discord events */
@injectable()
export class Controller implements IController {
    /* The ts-log logger */
    readonly logger: Logger;

    /* The client ID of the bot */
    readonly clientId: string;

    /* The token of the bot */
    readonly token: string;

    /** The persistent config */
    configuration: ConfigurationProvider;

    constructor(
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.ClientId) clientId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider
    ) {
        this.logger = logger;
        this.clientId = clientId;
        this.token = token;
        this.configuration = configuration;
    }
}
