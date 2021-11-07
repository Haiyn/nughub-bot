import container from '@src/inversify.config';
import { Provider } from '@src/providers/provider';
import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';
import * as IORedis from 'ioredis';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';

/** Provides emoji resources (names, ids) from the redis database */
@injectable()
export class EmojiProvider extends Provider {
    /** The redis client */
    private redisClient: Redis;

    /**
     * Constructs a config provider with a custom keyPrefix for the redis client
     *
     * @param {Logger} logger The ts-log logger
     */
    constructor(@inject(TYPES.ProviderLogger) logger: Logger) {
        super(logger);
        this.redisClient = new IORedis(
            container.get(TYPES.RedisHost),
            container.get(TYPES.RedisPort),
            {
                password: container.get(TYPES.RedisPassword),
                keyPrefix: 'EMOJIS.',
            }
        );
    }

    /**
     * Returns the value of a emoji key in format <:NAME:ID>
     *
     * @param key The key for the emoji resource in the redis database
     * @returns The emoji in format <:NAME:ID>
     */
    public async get(key: string): Promise<string> {
        const result = await this.redisClient.get(key);
        if (!result) this.logger.warn(`Failed to get emoji with key EMOJI.${key}`);
        return Promise.resolve(result);
    }
}
