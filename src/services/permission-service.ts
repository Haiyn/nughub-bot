import { inject, injectable, unmanaged } from "inversify";
import { TYPES } from "@src/types";
import { Logger } from "tslog";
import { GuildMemberRoleManager } from "discord.js";

@injectable()
export class PermissionService {
    private readonly logger: Logger;

    constructor(
        @unmanaged() props,
        @inject(TYPES.ServiceLogger) logger: Logger,
    ) {
        this.logger = logger;
    }

    public hasPermission(roles: GuildMemberRoleManager, permissionLevel: number): boolean {
        // TODO: get permission level for context.author.id OR context.author.role == Moderator
        return true;
    }

    public setPermission(): Promise<void> {
        // TODO: Set user at certain permission level
        Promise.resolve();
        return;
    }
}