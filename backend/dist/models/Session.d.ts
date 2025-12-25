import { Model, Optional, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin, Association } from 'sequelize';
import Batch from './Batch';
import User from './User';
import Attendance from './Attendance';
export declare enum SessionStatus {
    SCHEDULED = "scheduled",
    ONGOING = "ongoing",
    COMPLETED = "completed"
}
export interface SessionAttributes {
    id: number;
    batchId: number;
    facultyId: number | null;
    date: Date;
    startTime: string;
    endTime: string;
    topic: string | null;
    isBackup: boolean;
    status: SessionStatus;
    actualStartAt: Date | null;
    actualEndAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface SessionCreationAttributes extends Optional<SessionAttributes, 'id' | 'facultyId' | 'topic' | 'isBackup' | 'status' | 'actualStartAt' | 'actualEndAt' | 'createdAt' | 'updatedAt'> {
}
declare class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
    id: number;
    batchId: number;
    facultyId: number | null;
    date: Date;
    startTime: string;
    endTime: string;
    topic: string | null;
    isBackup: boolean;
    status: SessionStatus;
    actualStartAt: Date | null;
    actualEndAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getBatch: BelongsToGetAssociationMixin<Batch>;
    getFaculty: BelongsToGetAssociationMixin<User>;
    getAttendances: HasManyGetAssociationsMixin<Attendance>;
    static associations: {
        batch: Association<Session, Batch>;
        faculty: Association<Session, User>;
        attendances: Association<Session, Attendance>;
    };
}
export default Session;
//# sourceMappingURL=Session.d.ts.map