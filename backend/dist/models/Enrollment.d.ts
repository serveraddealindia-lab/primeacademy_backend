import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
import Batch from './Batch';
export interface EnrollmentAttributes {
    id: number;
    studentId: number;
    batchId: number;
    enrollmentDate: Date;
    status: string | null;
    paymentPlan: Record<string, unknown> | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface EnrollmentCreationAttributes extends Optional<EnrollmentAttributes, 'id' | 'status' | 'paymentPlan' | 'createdAt' | 'updatedAt'> {
}
declare class Enrollment extends Model<EnrollmentAttributes, EnrollmentCreationAttributes> implements EnrollmentAttributes {
    id: number;
    studentId: number;
    batchId: number;
    enrollmentDate: Date;
    status: string | null;
    paymentPlan: Record<string, unknown> | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getStudent: BelongsToGetAssociationMixin<User>;
    getBatch: BelongsToGetAssociationMixin<Batch>;
    static associations: {
        student: Association<Enrollment, User>;
        batch: Association<Enrollment, Batch>;
    };
}
export default Enrollment;
//# sourceMappingURL=Enrollment.d.ts.map