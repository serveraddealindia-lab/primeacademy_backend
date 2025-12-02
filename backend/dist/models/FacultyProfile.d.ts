import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export interface FacultyProfileAttributes {
    id: number;
    userId: number;
    expertise: Record<string, unknown> | null;
    availability: Record<string, unknown> | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface FacultyProfileCreationAttributes extends Optional<FacultyProfileAttributes, 'id' | 'expertise' | 'availability' | 'createdAt' | 'updatedAt'> {
}
declare class FacultyProfile extends Model<FacultyProfileAttributes, FacultyProfileCreationAttributes> implements FacultyProfileAttributes {
    id: number;
    userId: number;
    expertise: Record<string, unknown> | null;
    availability: Record<string, unknown> | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getUser: BelongsToGetAssociationMixin<User>;
    static associations: {
        user: Association<FacultyProfile, User>;
    };
}
export default FacultyProfile;
//# sourceMappingURL=FacultyProfile.d.ts.map