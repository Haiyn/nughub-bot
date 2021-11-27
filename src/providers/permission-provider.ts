import { CommandPermission } from '@models/commands/command-permission';
import { ConfigurationError } from '@models/config/configuration-error';
import { PermissionLevel } from '@models/permissions/permission-level';
import { PermissionType } from '@models/permissions/permission-type';
import { Command } from '@src/commands';
import container from '@src/inversify.config';
import { Provider } from '@src/providers/provider';
import { TYPES } from '@src/types';
import { Guild } from 'discord.js';
import { inject, injectable } from 'inversify';
import * as IORedis from 'ioredis';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';

/** Provides permissions in conjunction with stored permission configuration */
@injectable()
export class PermissionProvider extends Provider {
    /** The redis client */
    private redisClient: Redis;

    /**
     * Constructs a config provider with a custom keyPrefix for the redis client
     *
     * @param {Logger} logger The ts-log logger
     */
    constructor(@inject(TYPES.ProviderLogger) logger: Logger) {
        super(logger);
        this.redisClient = new IORedis(
            container.get(TYPES.RedisHost),
            container.get(TYPES.RedisPort),
            {
                password: container.get(TYPES.RedisPassword),
                keyPrefix: 'PERMISSION_',
            }
        );
    }

    /**
     * Takes a command and constructs a permission object to add to the discord application command
     * depending on the permission level of the command
     *
     * @param applicationCommand The internal application command
     * @param guild The guild for which the permission should be added
     * @returns An array of CommandPermissions
     */
    public async mapCommandToCommandPermissions(
        applicationCommand: Command,
        guild: Guild
    ): Promise<CommandPermission[]> {
        const permissions: CommandPermission[] = [];
        const permissionLevel = applicationCommand.permissionLevel;

        // Disable the command for everyone
        permissions.push({
            id: guild.roles.everyone.id,
            type: PermissionType.ROLE,
            permission: false,
        });

        // Attach all role permissions up to and including the permission level
        for (
            let level = permissionLevel;
            level < Object.keys(PermissionLevel).length / 2;
            level++
        ) {
            const roleId = await this.redisClient.get(`Role_${level}_Id`);
            if (!roleId)
                throw new ConfigurationError(`Could not find a Role ID for 'Role_${level}_Id'`);

            permissions.push({
                id: roleId,
                type: PermissionType.ROLE,
                permission: true,
            });
        }

        // Attach owner permissions
        permissions.push({
            id: await this.redisClient.get('User_4_Id'),
            type: PermissionType.USER,
            permission: true,
        });

        this.logger.trace(`Attaching following permissions : ${JSON.stringify(permissions)}`);
        return permissions;
    }
}
