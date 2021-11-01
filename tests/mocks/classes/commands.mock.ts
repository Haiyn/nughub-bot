import { Ping } from '../../../src/commands';
import { mockClient } from '../api/client.mock';
import { mockConfiguration, mockLogger } from './internals.mock';
import { mockStringProvider } from './providers.mock';
import {
    mockChannelService,
    mockHelperService,
    mockMessageService,
    mockUserService,
} from './services.mock';

export function mockPing(): Ping {
    return new Ping(
        mockLogger(),
        mockClient(),
        mockConfiguration(),
        mockChannelService(),
        mockHelperService(),
        mockMessageService(),
        mockUserService(),
        mockStringProvider()
    );
}
