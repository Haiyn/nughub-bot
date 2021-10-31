import { IConfiguration } from '@models/configuration';
import { HelperService } from '@services/index';
import { Service } from '@services/service';
import { TYPES } from '@src/types';
import { Client, User } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class UserService extends Service {
    private readonly helperService: HelperService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Configuration) configuration: IConfiguration,
        @inject(TYPES.HelperService) helperService: HelperService
    ) {
        super(client, logger, configuration);
        this.helperService = helperService;
    }

    public getUserByUserId(dirtyId: string): User {
        const sanitizedUserId = this.helperService.sanitizeDiscordId(dirtyId);
        if (!sanitizedUserId) return null;

        const matchedUser = this.client.users.cache.get(sanitizedUserId);
        if (!matchedUser) {
            this.logger.warn(`Could not match a Discord user for ID ${sanitizedUserId}`);
            return null;
        }
        return matchedUser;
    }
}
