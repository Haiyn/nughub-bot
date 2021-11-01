import { Service } from '@services/service';
import { injectable } from 'inversify';

@injectable()
export class HelperService extends Service {
    private readonly discordIdRegex: RegExp = /([0-9]{18})/g;

    /**
     * Sanitizes a discord ID into pure numbers, 18 numbers
     *
     * @param {string} dirtyId The ID to sanitize
     * @returns {string} The sanitized ID
     */
    public sanitizeDiscordId(dirtyId: string): string {
        const foundMatch = dirtyId.match(this.discordIdRegex);
        if (!foundMatch) {
            this.logger.warn(`Passed an invalid Discord ID to sanitize: ${dirtyId}`);
            return null;
        }
        return foundMatch[0];
    }
}
