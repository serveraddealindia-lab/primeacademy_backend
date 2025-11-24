import { Model, Optional } from 'sequelize';
export declare enum UserRole {
    SUPERADMIN = "superadmin",
    ADMIN = "admin",
    FACULTY = "faculty",
    STUDENT = "student",
    EMPLOYEE = "employee"
}
export interface UserAttributes {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: UserRole;
    passwordHash: string;
    avatarUrl?: string | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'phone' | 'avatarUrl' | 'isActive' | 'createdAt' | 'updatedAt'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: UserRole;
    passwordHash: string;
    avatarUrl: string | null;
    isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default User;
//# sourceMappingURL=User.d.ts.map