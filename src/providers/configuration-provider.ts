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
        this.logger.debug(
            `${member} is ${
                result ? '' : 'not'
            } a member of ${key}, where ${key} is: ${await this.redisClient.smembers(
                'CONFIGURATION_' + key
            )}`
        );
        return Promise.resolve(result);
    }

    /**
     * Scans the redis database recursively for available keys and returns them
     *
     * @param cursor Where the scan cursor is at right now
     * @param pattern the (regex) pattern which keys should be returned
     * @param foundKeys Found redis keys that match the pattern (so far)
     * @returns All found redis keys that match the pattern as an array
     */
    public async scan(cursor: number, pattern: string, foundKeys: string[]): Promise<string[]> {
        return this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100).then((result) => {
            cursor = result[0] as unknown as number;
            const keys = result[1];
            keys.forEach((key) => {
                this.logger.trace(`Found new redis key: ${key}`);
                foundKeys.push(key);
            });

            if (cursor == 0) {
                this.logger.trace(`Cursor at null. Redis key fetch done.`);
                return foundKeys;
            } else {
                return this.scan(cursor, pattern, foundKeys);
            }
        });
    }
}
