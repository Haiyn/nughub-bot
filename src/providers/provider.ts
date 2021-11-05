import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';

@injectable()
export class Provider {
    /** The io redis database client */
    protected readonly redisClient: Redis;

    /* The ts-log logger */
    protected readonly logger: Logger;

    constructor(
        @inject(TYPES.RedisClient) redisClient: Redis,
        @inject(TYPES.ProviderLogger) logger: Logger
    ) {
        this.redisClient = redisClient;
        this.logger = logger;
    }
}
