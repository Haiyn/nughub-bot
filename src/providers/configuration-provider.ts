import { ConfigurationError } from '@models/config/configuration-error';
import { Provider } from '@providers/provider';
import container from '@src/inversify.config';
import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';
import * as IORedis from 'ioredis';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';

/** Provides configuration as strings, lists and sets from the redis database */
@injectable()
export class ConfigurationProvider extends Provider {
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
                keyPrefix: 'CONFIGURATION_',
            }
        );
    }

    /**
     * Gets a string configuration value from the redis database
     *
     * @param key The key of the configuration value to get
     * @returns The value
     * @throws {ConfigurationError} Throws if key was not found
     */
    public async getString(key: string): Promise<string> {
        const result = await this.redisClient.get(key);
        if (!result) throw new ConfigurationError(`Value for key ${key} does not exist`);
        return result;
    }

    /**
     * Gets a redis set as a string array
     *
     * @param key The key of the redis set
     * @returns The string array
     * @throws {ConfigurationError} Throws if key was not found
     */
    public async getSet(key: string): Promise<string[]> {
        const result: string[] = await this.redisClient.smembers(key);
        if (!result) throw new ConfigurationError(`Value for key ${key} does not exist`);
        return result;
    }

    /**
     * Searches if a given member is in a redis set
     *
     * @param key The key of the set to search in
     * @param member The set member to search for
     * @returns False if key not found or not in set, true if in set
     */
    public async isIn(key: string, member: string): Promise<boolean> {
        const result = (await this.redisClient.sismember(key, member)) != 0;
        return Promise.resolve(result);
    }
}
