import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export declare enum ChangeRequestStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export interface ChangeRequestAttributes {
    id: number;
    entityType: string;
    entityId: number;
    requestedBy: number;
    approverId: number | null;
    status: ChangeRequestStatus;
    reason: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface ChangeRequestCreationAttributes extends Optional<ChangeRequestAttributes, 'id' | 'approverId' | 'status' | 'reason' | 'createdAt' | 'updatedAt'> {
}
declare class ChangeRequest extends Model<ChangeRequestAttributes, ChangeRequestCreationAttributes> implements ChangeRequestAttributes {
    id: number;
    entityType: string;
    entityId: number;
    requestedBy: number;
    approverId: number | null;
    status: ChangeRequestStatus;
    reason: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getRequester: BelongsToGetAssociationMixin<User>;
    getApprover: BelongsToGetAssociationMixin<User>;
    static associations: {
        requester: Association<ChangeRequest, User>;
        approver: Association<ChangeRequest, User>;
    };
}
export default ChangeRequest;
//# sourceMappingURL=ChangeRequest.d.ts.map