import { Service } from '@services/service';
import { injectable } from 'inversify';

/** A service that has helpful functions relating to all the Discord objects in general */
@injectable()
export class HelperService extends Service {
    private readonly discordIdRegex: RegExp = /([0-9]{18})/g;

    /**
     * Sanitizes a discord ID into pure numbers, 18 numbers
     *
     * @param dirtyId The ID to sanitize
     * @returns The sanitized ID
     */
    public sanitizeDiscordId(dirtyId: string): string {
        const foundMatch = dirtyId.match(this.discordIdRegex);
        if (!foundMatch) {
            this.logger.warn(`Passed an invalid Discord ID to sanitize: ${dirtyId}`);
            return null;
        }
        return foundMatch[0];
    }

    /**
     * Checks if a passed string is a valid Discord ID
     *
     * @param stringValue the string to check
     * @return true if discord ID, false if not
     */
    public isDiscordId(stringValue: string): boolean {
        const foundMatch = stringValue.match(this.discordIdRegex);
        return foundMatch !== null;
    }
}
