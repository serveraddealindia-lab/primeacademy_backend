import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export interface StudentProfileAttributes {
    id: number;
    userId: number;
    dob: Date | null;
    address: string | null;
    documents: Record<string, unknown> | null;
    photoUrl: string | null;
    softwareList: string[] | null;
    enrollmentDate: Date | null;
    status: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface StudentProfileCreationAttributes extends Optional<StudentProfileAttributes, 'id' | 'dob' | 'address' | 'documents' | 'photoUrl' | 'softwareList' | 'enrollmentDate' | 'status' | 'createdAt' | 'updatedAt'> {
}
declare class StudentProfile extends Model<StudentProfileAttributes, StudentProfileCreationAttributes> implements StudentProfileAttributes {
    id: number;
    userId: number;
    dob: Date | null;
    address: string | null;
    documents: Record<string, unknown> | null;
    photoUrl: string | null;
    softwareList: string[] | null;
    enrollmentDate: Date | null;
    status: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getUser: BelongsToGetAssociationMixin<User>;
    static associations: {
        user: Association<StudentProfile, User>;
    };
}
export default StudentProfile;
//# sourceMappingURL=StudentProfile.d.ts.map