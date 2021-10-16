export interface IConfiguration {
    guild: {
        prefix: string;
        color: string;
    };
    channels: {
        currentSessionsChannelId: string;
        internalChannelId: string;
        notificationChannelId: string;
        rpChannelIds: string[];
    };
    roles: {
        administratorId: string;
        moderatorId: string;
        userIds: Array<string>;
    };
}
