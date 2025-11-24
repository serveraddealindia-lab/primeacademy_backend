import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
import Batch from './Batch';
export declare enum SoftwareCompletionStatus {
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed"
}
export interface SoftwareCompletionAttributes {
    id: number;
    studentId: number;
    batchId: number;
    softwareName: string;
    startDate: Date;
    endDate: Date;
    facultyId: number | null;
    status: SoftwareCompletionStatus;
    completedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface SoftwareCompletionCreationAttributes extends Optional<SoftwareCompletionAttributes, 'id' | 'facultyId' | 'status' | 'completedAt' | 'createdAt' | 'updatedAt'> {
}
declare class SoftwareCompletion extends Model<SoftwareCompletionAttributes, SoftwareCompletionCreationAttributes> implements SoftwareCompletionAttributes {
    id: number;
    studentId: number;
    batchId: number;
    softwareName: string;
    startDate: Date;
    endDate: Date;
    facultyId: number | null;
    status: SoftwareCompletionStatus;
    completedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getStudent: BelongsToGetAssociationMixin<User>;
    getBatch: BelongsToGetAssociationMixin<Batch>;
    getFaculty: BelongsToGetAssociationMixin<User>;
    static associations: {
        student: Association<SoftwareCompletion, User>;
        batch: Association<SoftwareCompletion, Batch>;
        faculty: Association<SoftwareCompletion, User>;
    };
}
export default SoftwareCompletion;
//# sourceMappingURL=SoftwareCompletion.d.ts.map