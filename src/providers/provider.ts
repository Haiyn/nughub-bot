import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class Provider {
    /* The ts-log logger */
    protected readonly logger: Logger;

    constructor(@inject(TYPES.ProviderLogger) logger: Logger) {
        this.logger = logger;
    }
}
