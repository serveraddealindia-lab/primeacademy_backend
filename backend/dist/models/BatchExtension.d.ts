import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
import Batch from './Batch';
export declare enum ExtensionStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export interface BatchExtensionAttributes {
    id: number;
    batchId: number;
    requestedBy: number;
    numberOfSessions: number;
    reason: string | null;
    status: ExtensionStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface BatchExtensionCreationAttributes extends Optional<BatchExtensionAttributes, 'id' | 'reason' | 'status' | 'approvedBy' | 'approvedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {
}
declare class BatchExtension extends Model<BatchExtensionAttributes, BatchExtensionCreationAttributes> implements BatchExtensionAttributes {
    id: number;
    batchId: number;
    requestedBy: number;
    numberOfSessions: number;
    reason: string | null;
    status: ExtensionStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getBatch: BelongsToGetAssociationMixin<Batch>;
    getRequester: BelongsToGetAssociationMixin<User>;
    getApprover: BelongsToGetAssociationMixin<User>;
    static associations: {
        batch: Association<BatchExtension, Batch>;
        requester: Association<BatchExtension, User>;
        approver: Association<BatchExtension, User>;
    };
}
export default BatchExtension;
//# sourceMappingURL=BatchExtension.d.ts.map