import { injectable } from "inversify";
import { TYPES } from "@src/types";
import { GuildMember, GuildMemberRoleManager } from "discord.js";
import container from "@src/inversify.config";
import { Service } from "@services/service";

@injectable()
export class PermissionService extends Service {

    public hasPermission(user: GuildMember, commandPermissionLevel: number): boolean {
        if(container.get<string>(TYPES.BotOwnerId).includes(user.id)) return true;
        if(commandPermissionLevel == 0) return true;

        const userPermissionLevel = this.determineUserPermissionLevel(user.roles);
        this.logger.debug(`User has permission level ${userPermissionLevel} while command has permission level ${commandPermissionLevel}. Returning: ${userPermissionLevel >= commandPermissionLevel}`);
        return userPermissionLevel >= commandPermissionLevel;
    }

    private determineUserPermissionLevel(roles: GuildMemberRoleManager): number {
        let userPermission = 0;
        roles.cache.forEach(userRole => {
            if(userRole.id === this.configuration.roles.administratorId) {
                userPermission = 3;
                return;
            }
            if(userRole.id === this.configuration.roles.moderatorId) {
                userPermission = 2;
                return;
            }
            this.configuration.roles.userIds.forEach(roleId => {
                if(userRole.id === roleId) {
                    userPermission = 1;
                    return;
                }
            });
        });
        return userPermission;
    }
}