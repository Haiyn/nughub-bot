import { Provider } from '@src/providers/provider';
import { injectable } from 'inversify';

@injectable()
export class EmojiProvider extends Provider {
    public async get(key: string): Promise<string> {
        const result = await this.redisClient.get('EMOJIS.' + key);
        if (!result) this.logger.warn(`Failed to get emoji with key EMOJI.${key}`);
        return Promise.resolve(result);
    }
}
