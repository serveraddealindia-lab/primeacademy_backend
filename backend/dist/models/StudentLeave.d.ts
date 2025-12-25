import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
import Batch from './Batch';
export declare enum LeaveStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export interface StudentLeaveAttributes {
    id: number;
    studentId: number;
    batchId: number;
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
export interface StudentLeaveCreationAttributes extends Optional<StudentLeaveAttributes, 'id' | 'reason' | 'status' | 'approvedBy' | 'approvedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {
}
declare class StudentLeave extends Model<StudentLeaveAttributes, StudentLeaveCreationAttributes> implements StudentLeaveAttributes {
    id: number;
    studentId: number;
    batchId: number;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: LeaveStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getStudent: BelongsToGetAssociationMixin<User>;
    getBatch: BelongsToGetAssociationMixin<Batch>;
    getApprover: BelongsToGetAssociationMixin<User>;
    static associations: {
        student: Association<StudentLeave, User>;
        batch: Association<StudentLeave, Batch>;
        approver: Association<StudentLeave, User>;
    };
}
export default StudentLeave;
//# sourceMappingURL=StudentLeave.d.ts.map