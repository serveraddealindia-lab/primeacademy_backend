import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export declare enum LeaveStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export interface FacultyLeaveAttributes {
    id: number;
    facultyId: number;
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
export interface FacultyLeaveCreationAttributes extends Optional<FacultyLeaveAttributes, 'id' | 'reason' | 'status' | 'approvedBy' | 'approvedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {
}
declare class FacultyLeave extends Model<FacultyLeaveAttributes, FacultyLeaveCreationAttributes> implements FacultyLeaveAttributes {
    id: number;
    facultyId: number;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: LeaveStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getFaculty: BelongsToGetAssociationMixin<User>;
    getApprover: BelongsToGetAssociationMixin<User>;
    static associations: {
        faculty: Association<FacultyLeave, User>;
        approver: Association<FacultyLeave, User>;
    };
}
export default FacultyLeave;
//# sourceMappingURL=FacultyLeave.d.ts.map