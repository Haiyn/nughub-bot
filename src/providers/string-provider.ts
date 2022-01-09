import container from '@src/inversify.config';
import { Provider } from '@src/providers/provider';
import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';
import * as IORedis from 'ioredis';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';
import { String } from 'typescript-string-operations';

/** Provides string resources (text) from the redis database */
@injectable()
export class StringProvider extends Provider {
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
                keyPrefix: 'STRINGS.',
            }
        );
    }

    /**
     * Gets the localization string for a string key and substitutes string parameters with the passed parameters
     * String parameter format is {int}
     *
     * @param key The key
     * @param parameters The parameters if the string is parameterized
     * @returns The string with all substituted parameters or an error message if it failed
     */
    public async get(key: string, parameters?: string[]): Promise<string> {
        let result = await this.redisClient.get(key);
        if (!result) {
            // Since strings are used in message sending, make sure that they are not null
            this.logger.warn(`Failed to get string with key STRINGS.${key} on GET request.`);
            return key;
        }

        // Append the parameters, if there are any
        if (parameters) {
            try {
                result = String.Format(result, parameters);
            } catch (error) {
                this.logger.warn(
                    `Supplied the wrong parameters for STRINGS.${key}: ${result}\nSupplied ${
                        parameters.length
                    } parameters: ${JSON.stringify(parameters)}`
                );
                return key;
            }
        }
        return result;
    }

    /**
     * Sets a string key
     *
     * @param key the key to set
     * @param newValue the new value to set
     * @returns true when successful, false otherwise
     */
    public async set(key: string, newValue: string): Promise<boolean> {
        const result = await this.redisClient.get(key);
        if (!result) {
            this.logger.warn(`Failed to get string with key STRINGS.${key} on SET request.`);
            return false;
        }

        const successful = await this.redisClient.set(key, newValue);
        return successful === 'OK';
    }
}
