import { inject, injectable } from "inversify";
import { Logger } from "tslog";
import { TYPES } from "@src/types";

@injectable()
export class HelperService {
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger
    ) {
        this.logger = logger;
    }

    public sanitizeDiscordId(dirtyId: string): string {
        const discordIdRegex = /([0-9]{18})/g;
        const foundMatch = dirtyId.match(discordIdRegex);
        if(!foundMatch) {
            this.logger.warn(`Passed an invalid Discord ID to sanitize: ${dirtyId}`);
            return null;
        }
        return foundMatch[0];
    }
}