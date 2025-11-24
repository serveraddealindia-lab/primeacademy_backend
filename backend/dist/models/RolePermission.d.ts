import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import Role from './Role';
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
    BATCH_EXTENSIONS = "batch_extensions",
    EMPLOYEE_LEAVES = "employee_leaves",
    FACULTY_LEAVES = "faculty_leaves"
}
export interface RolePermissionAttributes {
    id: number;
    roleId: number;
    module: Module;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, 'id' | 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'createdAt' | 'updatedAt'> {
}
declare class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
    id: number;
    roleId: number;
    module: Module;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getRole: BelongsToGetAssociationMixin<Role>;
    static associations: {
        role: Association<RolePermission, Role>;
    };
}
export default RolePermission;
//# sourceMappingURL=RolePermission.d.ts.map