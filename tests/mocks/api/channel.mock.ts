import { Channel } from 'discord.js';
import { RawChannelData } from 'discord.js/typings/rawDataTypes';
import { mockClient } from './client.mock';

const client = mockClient();

export const defaultChannelData: RawChannelData = {
    id: 'channel-id',
    permissions: 'permissions',
    type: null,
};

export function mockChannel(data: RawChannelData = defaultChannelData): Channel {
    return new Channel(client, data);
}
