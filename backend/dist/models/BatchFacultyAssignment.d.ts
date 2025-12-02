import { Model, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import Batch from './Batch';
import User from './User';
export interface BatchFacultyAssignmentAttributes {
    id: number;
    batchId: number;
    facultyId: number;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface BatchFacultyAssignmentCreationAttributes extends Optional<BatchFacultyAssignmentAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class BatchFacultyAssignment extends Model<BatchFacultyAssignmentAttributes, BatchFacultyAssignmentCreationAttributes> implements BatchFacultyAssignmentAttributes {
    id: number;
    batchId: number;
    facultyId: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getBatch: BelongsToGetAssociationMixin<Batch>;
    getFaculty: BelongsToGetAssociationMixin<User>;
}
export default BatchFacultyAssignment;
//# sourceMappingURL=BatchFacultyAssignment.d.ts.map