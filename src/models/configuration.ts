import { literal, singleOrArray, stringItem } from "confinode";

export interface Configuration {
    prefix: string,
    currentSessionsChannelId: string,
    internalChannelId: string,
    notificationChannelId: string,
    rpChannelIds: string[],
    guildColor: string,
}

export const description = literal<Configuration>({
    prefix: stringItem,
    currentSessionsChannelId: stringItem,
    notificationChannelId: stringItem,
    internalChannelId: stringItem,
    rpChannelIds: singleOrArray(stringItem()),
    guildColor: stringItem
});