import { Provider } from '@src/providers/provider';
import { injectable } from 'inversify';
import { String } from 'typescript-string-operations';

/** Provides string resources (text) from the redis database */
@injectable()
export class StringProvider extends Provider {
    /**
     * Gets the localization string for a string key and substitutes string parameters with the passed parameters
     * String parameter format is {int}
     *
     * @param key The key
     * @param parameters The parameters if the string is parameterized
     * @returns The string with all substituted parameters or an error message if it failed
     */
    public async get(key: string, parameters?: string[]): Promise<string> {
        let result = await this.redisClient.get('STRINGS.' + key);
        if (!result) {
            // Since strings are used in message sending, make sure that they are not null
            this.logger.warn(`Failed to get string with key STRINGS.${key}`);
            return `\`Internal Error: Cannot resolve key ${key}\`\n`;
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
                return `\`Internal Error: Cannot resolve parameters for key ${key}\``;
            }
        }
        return result;
    }
}
