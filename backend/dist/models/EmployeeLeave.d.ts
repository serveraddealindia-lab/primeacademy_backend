import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export declare enum LeaveStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export interface EmployeeLeaveAttributes {
    id: number;
    employeeId: number;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: LeaveStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface EmployeeLeaveCreationAttributes extends Optional<EmployeeLeaveAttributes, 'id' | 'reason' | 'status' | 'approvedBy' | 'approvedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {
}
declare class EmployeeLeave extends Model<EmployeeLeaveAttributes, EmployeeLeaveCreationAttributes> implements EmployeeLeaveAttributes {
    id: number;
    employeeId: number;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: LeaveStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getEmployee: BelongsToGetAssociationMixin<User>;
    getApprover: BelongsToGetAssociationMixin<User>;
    static associations: {
        employee: Association<EmployeeLeave, User>;
        approver: Association<EmployeeLeave, User>;
    };
}
export default EmployeeLeave;
//# sourceMappingURL=EmployeeLeave.d.ts.map