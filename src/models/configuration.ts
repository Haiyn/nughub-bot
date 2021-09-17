import { literal, stringItem } from "confinode";

export interface Configuration {
    prefix: string,
    sessionPostId: string
}

export const description = literal<Configuration>({
    prefix: stringItem,
    sessionPostId: stringItem
});