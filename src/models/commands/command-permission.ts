import { PermissionType } from '@models/permissions/permission-type';

export interface CommandPermission {
    id: string;
    type: PermissionType;
    permission: boolean;
}
