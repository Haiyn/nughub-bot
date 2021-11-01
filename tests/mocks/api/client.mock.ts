import { Client, Intents } from 'discord.js';

export function mockClient(): Client {
    return new Client({
        intents: [
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_TYPING,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILDS,
        ],
    });
}
