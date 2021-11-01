import { StringProvider } from '../../../src/providers';
import { mockLogger, mockRedisClient } from './internals.mock';

export function mockStringProvider(): StringProvider {
    return new StringProvider(mockRedisClient(), mockLogger());
}
