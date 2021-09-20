import { inject, injectable } from "inversify";
import { TYPES } from "@src/types";
import { Logger } from "tslog";
import { GuildMember, GuildMemberRoleManager } from "discord.js";
import container from "@src/inversify.config";
import { Configuration } from "@models/configuration";

@injectable()
export class PermissionService {
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger,
    ) {
        this.logger = logger;
    }

    public hasPermission(user: GuildMember, commandPermissionLevel: number): boolean {
        if(container.get<string>(TYPES.BotOwnerId).includes(user.id)) return true;
        if(commandPermissionLevel == 0) return true;

        const userPermissionLevel = this.determineUserPermissionLevel(user.roles);
        this.logger.debug(`User has permission level ${userPermissionLevel} while command has permission level ${commandPermissionLevel}. Returning: ${userPermissionLevel >= commandPermissionLevel}`);
        return userPermissionLevel >= commandPermissionLevel;
    }

    private determineUserPermissionLevel(roles: GuildMemberRoleManager): number {
        let userPermission = 0;
        const configuration = container.get<Configuration>(TYPES.Configuration);
        roles.cache.forEach(userRole => {
            if(userRole.id === configuration.roleIds.administrator) {
                userPermission = 3;
                return;
            }
            if(userRole.id === configuration.roleIds.moderator) {
                userPermission = 2;
                return;
            }
            configuration.roleIds.user.forEach(roleId => {
                if(userRole.id === roleId) {
                    userPermission = 1;
                    return;
                }
            });
        });
        return userPermission;
    }
}