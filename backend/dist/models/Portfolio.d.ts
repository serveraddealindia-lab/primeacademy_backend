import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
import Batch from './Batch';
export declare enum PortfolioStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export interface PortfolioAttributes {
    id: number;
    studentId: number;
    batchId: number;
    files: Record<string, unknown> | null;
    pdfUrl: string | null;
    youtubeUrl: string | null;
    status: PortfolioStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface PortfolioCreationAttributes extends Optional<PortfolioAttributes, 'id' | 'files' | 'status' | 'approvedBy' | 'approvedAt' | 'createdAt' | 'updatedAt'> {
}
declare class Portfolio extends Model<PortfolioAttributes, PortfolioCreationAttributes> implements PortfolioAttributes {
    id: number;
    studentId: number;
    batchId: number;
    files: Record<string, unknown> | null;
    pdfUrl: string | null;
    youtubeUrl: string | null;
    status: PortfolioStatus;
    approvedBy: number | null;
    approvedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getStudent: BelongsToGetAssociationMixin<User>;
    getBatch: BelongsToGetAssociationMixin<Batch>;
    getApprover: BelongsToGetAssociationMixin<User>;
    static associations: {
        student: Association<Portfolio, User>;
        batch: Association<Portfolio, Batch>;
        approver: Association<Portfolio, User>;
    };
}
export default Portfolio;
//# sourceMappingURL=Portfolio.d.ts.map