import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export interface EmployeePunchAttributes {
    id: number;
    userId: number;
    date: string;
    punchInAt: Date | null;
    punchOutAt: Date | null;
    punchInPhoto: string | null;
    punchOutPhoto: string | null;
    punchInFingerprint: string | null;
    punchOutFingerprint: string | null;
    punchInLocation: Record<string, unknown> | null;
    punchOutLocation: Record<string, unknown> | null;
    breaks: Record<string, unknown>[] | Record<string, unknown> | null;
    effectiveWorkingHours: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface EmployeePunchCreationAttributes extends Optional<EmployeePunchAttributes, 'id' | 'punchInAt' | 'punchOutAt' | 'punchInPhoto' | 'punchOutPhoto' | 'punchInFingerprint' | 'punchOutFingerprint' | 'punchInLocation' | 'punchOutLocation' | 'breaks' | 'effectiveWorkingHours' | 'createdAt' | 'updatedAt'> {
}
declare class EmployeePunch extends Model<EmployeePunchAttributes, EmployeePunchCreationAttributes> implements EmployeePunchAttributes {
    id: number;
    userId: number;
    date: string;
    punchInAt: Date | null;
    punchOutAt: Date | null;
    punchInPhoto: string | null;
    punchOutPhoto: string | null;
    punchInFingerprint: string | null;
    punchOutFingerprint: string | null;
    punchInLocation: Record<string, unknown> | null;
    punchOutLocation: Record<string, unknown> | null;
    breaks: Record<string, unknown>[] | Record<string, unknown> | null;
    effectiveWorkingHours: number | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getUser: BelongsToGetAssociationMixin<User>;
    static associations: {
        user: Association<EmployeePunch, User>;
    };
}
export default EmployeePunch;
//# sourceMappingURL=EmployeePunch.d.ts.map