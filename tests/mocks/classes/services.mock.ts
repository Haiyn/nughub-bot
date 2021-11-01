import { injectable } from 'inversify';
import { ChannelService, HelperService, MessageService, UserService } from '../../../src/services';
import { mockClient } from '../api/client.mock';
import { mockConfiguration, mockLogger } from './internals.mock';

export function mockChannelService(): ChannelService {
    return new ChannelService(mockClient(), mockLogger(), mockConfiguration(), mockHelperService());
}

export function mockHelperService(): HelperService {
    return new HelperService(mockClient(), mockLogger(), mockConfiguration());
}

@injectable()
export class MockMessageService {}
export function mockMessageService(): MessageService {
    return new MessageService(
        mockClient(),
        mockLogger(),
        mockConfiguration(),
        mockChannelService()
    );
}

export function mockUserService(): UserService {
    return new UserService(mockClient(), mockLogger(), mockConfiguration(), mockHelperService());
}
