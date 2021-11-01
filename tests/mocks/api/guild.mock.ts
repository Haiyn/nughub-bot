import { Guild } from 'discord.js';
import { RawGuildData } from 'discord.js/typings/rawDataTypes';
import { mockClient } from './client.mock';

const client = mockClient();

export const defaultGuildData: RawGuildData = {
    id: 'guild-id',
    name: 'mocked js guild',
    icon: 'mocked guild icon url',
    splash: 'mocked guild splash url',
    region: 'eu-west',
    application_id: 'application-id',
    afk_channel_id: 'afk-channel-id',
    system_channel_id: 'system-channel-id',
    public_updates_channel_id: 'public-updates-channel-id',
    rules_channel_id: 'rules-channel-id',
    owner_id: 'owner-id',
    preferred_locale: 'en-US',
    description: '',
    discovery_splash: '',
    banner: '',
    system_channel_flags: null,
    default_message_notifications: null,
    nsfw_level: null,
    premium_tier: null,
    vanity_url_code: '',
    unavailable: false,
    large: false,
    afk_timeout: 0,
    member_count: 42,
    verification_level: 2,
    explicit_content_filter: 3,
    mfa_level: 8,
    joined_at: new Date('2018-01-01').getTime().toString(),
    features: [],
    channels: [],
    roles: [],
    presences: [],
    voice_states: [],
    emojis: [],
    stickers: [],
};

export function mockGuild(data: RawGuildData = defaultGuildData): Guild {
    const g = new Guild(client, {
        ...data,
    });
    client.guilds.cache.set(g.id, g);
    return g;
}
