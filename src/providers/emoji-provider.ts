import { Provider } from '@src/providers/provider';
import { injectable } from 'inversify';

/** Provides emoji resources (names, ids) from the redis database */
@injectable()
export class EmojiProvider extends Provider {
    /**
     * Returns the value of a emoji key in format <:NAME:ID>
     *
     * @param key The key for the emoji resource in the redis database
     * @returns The emoji in format <:NAME:ID>
     */
    public async get(key: string): Promise<string> {
        const result = await this.redisClient.get('EMOJIS.' + key);
        if (!result) this.logger.warn(`Failed to get emoji with key EMOJI.${key}`);
        return Promise.resolve(result);
    }
}
