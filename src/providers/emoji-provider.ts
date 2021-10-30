import { injectable } from 'inversify';
import { Provider } from '@src/providers/provider';

@injectable()
export class EmojiProvider extends Provider {
    public async get(key: string): Promise<string> {
        const result = await this.redisClient.get('EMOJIS.' + key);
        if (!result) this.logger.warn(`Failed to get emoji with key EMOJI.${key}`);
        return Promise.resolve(result);
    }
}
