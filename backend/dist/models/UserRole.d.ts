import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
import Role from './Role';
export interface UserRoleAttributes {
    id: number;
    userId: number;
    roleId: number;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface UserRoleCreationAttributes extends Optional<UserRoleAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
    id: number;
    userId: number;
    roleId: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    role?: Role;
    user?: User;
    getUser: BelongsToGetAssociationMixin<User>;
    getRole: BelongsToGetAssociationMixin<Role>;
    static associations: {
        user: Association<UserRole, User>;
        role: Association<UserRole, Role>;
    };
}
export default UserRole;
//# sourceMappingURL=UserRole.d.ts.map