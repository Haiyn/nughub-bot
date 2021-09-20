import { literal, singleOrArray, stringItem } from "confinode";

export interface Configuration {
    prefix: string,
    currentSessionsChannelId: string,
    internalChannelId: string,
    notificationChannelId: string,
    rpChannelIds: string[],
    guildColor: string,
    roleIds: {
        administrator: string,
        moderator: string,
        user: Array<string>
    }
}

export const description = literal<Configuration>({
    prefix: stringItem,
    currentSessionsChannelId: stringItem,
    notificationChannelId: stringItem,
    internalChannelId: stringItem,
    rpChannelIds: singleOrArray(stringItem()),
    guildColor: stringItem,
    roleIds: literal({
        administrator: stringItem,
        moderator: stringItem,
        user: singleOrArray(stringItem)
    })
});