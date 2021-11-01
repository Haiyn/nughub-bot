import * as IORedis from 'ioredis';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';
import configDev from '../../../src/config/config-dev';
import { IConfiguration } from '../../../src/models/configuration';

export function mockConfiguration(): IConfiguration {
    return configDev;
}

export function mockLogger(): Logger {
    return new Logger({
        name: 'Test Logger',
        minLevel: 'trace',
        ignoreStackLevels: 6,
    });
}

export function mockRedisClient(): Redis {
    return new IORedis();
}
