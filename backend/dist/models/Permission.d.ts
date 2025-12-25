import { Model, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import User from './User';
export declare enum Module {
    BATCHES = "batches",
    STUDENTS = "students",
    FACULTY = "faculty",
    EMPLOYEES = "employees",
    SESSIONS = "sessions",
    ATTENDANCE = "attendance",
    PAYMENTS = "payments",
    PORTFOLIOS = "portfolios",
    REPORTS = "reports",
    APPROVALS = "approvals",
    USERS = "users",
    SOFTWARE_COMPLETIONS = "software_completions",
    STUDENT_LEAVES = "student_leaves",
    BATCH_EXTENSIONS = "batch_extensions"
}
export interface PermissionAttributes {
    id: number;
    userId: number;
    module: Module;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'id' | 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'createdAt' | 'updatedAt'> {
}
declare class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
    id: number;
    userId: number;
    module: Module;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getUser: BelongsToGetAssociationMixin<User>;
}
export default Permission;
//# sourceMappingURL=Permission.d.ts.map