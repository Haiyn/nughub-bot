import { User } from 'discord.js';
import { mockClient } from './client.mock';

const client = mockClient();

export const defaultUserData = {
    avatar: null,
    discriminator: '',
    id: '',
    username: '',
};

export function mockUser(data: any = defaultUserData): User {
    return new User(client, {
        ...defaultUserData,
        ...data,
    });
}
