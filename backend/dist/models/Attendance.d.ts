import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import Session from './Session';
import User from './User';
export declare enum AttendanceStatus {
    PRESENT = "present",
    ABSENT = "absent",
    MANUAL_PRESENT = "manual_present"
}
export interface AttendanceAttributes {
    id: number;
    sessionId: number;
    studentId: number;
    status: AttendanceStatus;
    isManual: boolean;
    markedBy: number | null;
    markedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, 'id' | 'isManual' | 'markedBy' | 'markedAt' | 'createdAt' | 'updatedAt'> {
}
declare class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
    id: number;
    sessionId: number;
    studentId: number;
    status: AttendanceStatus;
    isManual: boolean;
    markedBy: number | null;
    markedAt: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getSession: BelongsToGetAssociationMixin<Session>;
    getStudent: BelongsToGetAssociationMixin<User>;
    getMarker: BelongsToGetAssociationMixin<User>;
    static associations: {
        session: Association<Attendance, Session>;
        student: Association<Attendance, User>;
        marker: Association<Attendance, User>;
    };
}
export default Attendance;
//# sourceMappingURL=Attendance.d.ts.map