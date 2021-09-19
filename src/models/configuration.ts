import { literal, singleOrArray, stringItem } from "confinode";

export interface Configuration {
    prefix: string,
    currentSessionsChannelId: string,
    internalChannelId: string,
    rpChannelIds: string[]
}

export const description = literal<Configuration>({
    prefix: stringItem,
    currentSessionsChannelId: stringItem,
    internalChannelId: stringItem,
    rpChannelIds: singleOrArray(stringItem())
});