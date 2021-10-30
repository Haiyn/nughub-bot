import { injectable } from 'inversify';
import { Provider } from '@src/providers/provider';
import { String } from 'typescript-string-operations';

@injectable()
export class StringProvider extends Provider {
    public async get(key: string, parameters?: string[]): Promise<string> {
        // Get the string value from the Redis store
        let result = await this.redisClient.get('STRINGS.' + key);
        if (!result) {
            // Since strings are used in message sending, make sure that they are not null
            this.logger.warn(`Failed to get string with key STRINGS.${key}`);
            return Promise.resolve(
                `\`Internal Error: Cannot resolve key ${key}.\`\nYour command was still successful.`
            );
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
                return Promise.resolve(
                    `\`Internal Error: Cannot resolve parameters for key ${key}\`\nYour command was still successful.`
                );
            }
        }

        return Promise.resolve(result);
    }
}
