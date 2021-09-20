import { inject, injectable } from "inversify";
import { Logger } from "tslog";
import { TYPES } from "@src/types";

@injectable()
export class HelperService {
    private readonly logger: Logger;
    private readonly discordIdRegex: RegExp;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger
    ) {
        this.logger = logger;
        this.discordIdRegex = /([0-9]{18})/g;
    }

    public sanitizeDiscordId(dirtyId: string): string {
        const foundMatch = dirtyId.match(this.discordIdRegex);
        if(!foundMatch) {
            this.logger.warn(`Passed an invalid Discord ID to sanitize: ${dirtyId}`);
            return null;
        }
        return foundMatch[0];
    }

    public isDiscordId(idToCheck: string): boolean {
        if(idToCheck == null) return false;
        const isDiscordId = idToCheck.match(this.discordIdRegex) != null;
        this.logger.trace(`${idToCheck} is ${isDiscordId ? "" : "not"} a discord ID.`);
        return isDiscordId;
    }
}