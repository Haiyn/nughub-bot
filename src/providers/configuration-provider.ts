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

    // region NUMBER

    /**
     * Gets a string and returns it as parsed number
     *
     * @param key the key to parse as number
     * @returns parsed value as number
     */
    public async getNumber(key: string): Promise<number> {
        const result = await this.redisClient.get(key);
        if (!result) throw new ConfigurationError(`Value for key ${key} does not exist`);
        if (result === '0') {
            // '0' is falsy  and can't be parsed
            return 0;
        }
        const number = Number.parseInt(result);
        if (!number)
            throw new ConfigurationError(
                `Value for key ${key} is not a parsable number: ${result}`
            );
        return number;
    }

    // endregion

    // region SET

    /**
     * Checks whether the value for a key is a set type
     *
     * @param key The key to check
     * @returns true if it is a set, false otherwise
     */
    public async isSet(key: string): Promise<boolean> {
        const result = await this.redisClient.type(key);
        this.logger.debug(`${key} is ${result}`);
        return result === 'set';
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
     * Adds one entry to a set
     *
     * @param key The key of the set to add to
     * @param values The string values to add to the set
     * @returns Returns whether value was added or not
     */
    public async addToSet(key: string, values: string[]): Promise<boolean> {
        const result = await this.redisClient.sadd(key, values);
        return result === 1;
    }

    /**
     * Removes one value from a set
     *
     * @param key The key of the set to remove the value from
     * @param value The value to remove
     * @returns Whether value was removed or not
     */
    public async removeFromSet(key: string, value: string): Promise<boolean> {
        const result = await this.redisClient.srem(key, value);
        return result === 1;
    }

    /**
     * Searches if a given member is in a redis set
     *
     * @param key The key of the set to search in
     * @param member The set member to search for
     * @returns False if key not found or not in set, true if in set
     */
    public async isInSet(key: string, member: string): Promise<boolean> {
        const result = (await this.redisClient.sismember(key, member)) != 0;
        return Promise.resolve(result);
    }

    // endregion

    // region STRING

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
     * Sets a redis key to a given string value
     *
     * @param key The key of the redis entry to set
     * @param value The value to set
     * @returns Returns when set
     */
    public async setString(key: string, value: string): Promise<void> {
        await this.redisClient.set(key, value);
    }

    // endregion

    // region UTILITY

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

    /**
     * Checks if a given key exists as an entry in the db
     *
     * @param key The key to check for
     * @returns true if exists, false otherwise
     */
    public async exists(key: string): Promise<boolean> {
        if (key.startsWith('CONFIGURATION_')) {
            key = key.slice(14);
        }
        const result = await this.redisClient.exists(key);
        return result !== 0;
    }

    // endregion
}
