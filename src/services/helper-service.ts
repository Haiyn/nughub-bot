import { Service } from '@services/service';
import { injectable } from 'inversify';

@injectable()
export class HelperService extends Service {
    private readonly discordIdRegex: RegExp = /([0-9]{18})/g;

    public sanitizeDiscordId(dirtyId: string): string {
        const foundMatch = dirtyId.match(this.discordIdRegex);
        if (!foundMatch) {
            this.logger.warn(`Passed an invalid Discord ID to sanitize: ${dirtyId}`);
            return null;
        }
        return foundMatch[0];
    }

    public isDiscordId(idToCheck: string): boolean {
        if (idToCheck == null) return false;
        const isDiscordId = idToCheck.match(this.discordIdRegex) != null;
        this.logger.trace(`${idToCheck} is ${isDiscordId ? '' : 'not'} a discord ID.`);
        return isDiscordId;
    }
}
