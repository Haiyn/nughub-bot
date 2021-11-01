import { CommandInteraction } from 'discord.js';
import { mockClient } from './client.mock';

const client = mockClient();

/*
Mocking this bullshit is the worst thing ever, I hate it and I hope it burns
 */
export const defaultCommandInteraction = {
    application_id: '',
    channel_id: '',
    data: undefined,
    id: '',
    token: '',
    type: undefined,
    version: 1,
};

export function mockCommandInteraction(data = {}): CommandInteraction {
    return new CommandInteraction(client, {
        application_id: '',
        channel_id: '',
        data: {
            id: '',
            resolved: {},
            name: '',
        },
        id: '',
        token: '',
        type: null,
        version: 1,
        user: {
            avatar: null,
            discriminator: '',
            id: '',
            username: '',
        },
    });
}
