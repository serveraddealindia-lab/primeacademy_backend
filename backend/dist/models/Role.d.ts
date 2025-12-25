import { Model, Optional, BelongsToManyGetAssociationsMixin, Association } from 'sequelize';
import User from './User';
import Permission from './Permission';
export interface RoleAttributes {
    id: number;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface RoleCreationAttributes extends Optional<RoleAttributes, 'id' | 'description' | 'isSystem' | 'isActive' | 'createdAt' | 'updatedAt'> {
}
declare class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
    id: number;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getUsers: BelongsToManyGetAssociationsMixin<User>;
    getPermissions: BelongsToManyGetAssociationsMixin<Permission>;
    static associations: {
        users: Association<Role, User>;
        permissions: Association<Role, Permission>;
    };
}
export default Role;
//# sourceMappingURL=Role.d.ts.map