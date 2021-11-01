import { Provider } from '@src/providers/provider';
import { injectable } from 'inversify';

@injectable()
export class EmojiProvider extends Provider {
    /**
     * Returns the value of a emoji key in format <:NAME:ID>
     *
     * @param {string} key The key for the emoji resource in the redis database
     * @returns {Promise<string>} The emoji in format <:NAME:ID>
     */
    public async get(key: string): Promise<string> {
        const result = await this.redisClient.get('EMOJIS.' + key);
        if (!result) this.logger.warn(`Failed to get emoji with key EMOJI.${key}`);
        return Promise.resolve(result);
    }
}
