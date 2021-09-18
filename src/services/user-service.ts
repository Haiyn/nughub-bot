import { inject, injectable } from "inversify";
import { Client, User } from "discord.js";
import { Logger } from "tslog";
import { TYPES } from "@src/types";
import { HelperService } from "@services/index";


@injectable()
export class UserService {
    private readonly logger: Logger;
    private readonly client: Client;
    private readonly helperService: HelperService;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.HelperService) helperService: HelperService
    ) {
        this.logger = logger;
        this.client = client;
        this.helperService = helperService;
    }

    public getUserByUserId(dirtyId: string): User {
        const sanitizedUserId = this.helperService.sanitizeDiscordId(dirtyId);
        if(!sanitizedUserId) return null;

        const matchedUser = this.client.users.cache.get(sanitizedUserId);
        if(!matchedUser) {
            this.logger.warn(`Could not match a Discord user for ID ${sanitizedUserId}`);
            return null;
        }
        return matchedUser;
    }
}