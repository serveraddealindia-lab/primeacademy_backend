import {
  Model,
  DataTypes,
  Optional,
  BelongsToGetAssociationMixin,
  Association,
} from 'sequelize';
import sequelize from '../config/database';
import Session from './Session';
import User from './User';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  MANUAL_PRESENT = 'manual_present',
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

export interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, 'id' | 'isManual' | 'markedBy' | 'markedAt' | 'createdAt' | 'updatedAt'> {}

class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
  public id!: number;
  public sessionId!: number;
  public studentId!: number;
  public status!: AttendanceStatus;
  public isManual!: boolean;
  public markedBy!: number | null;
  public markedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public getSession!: BelongsToGetAssociationMixin<Session>;
  public getStudent!: BelongsToGetAssociationMixin<User>;
  public getMarker!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    session: Association<Attendance, Session>;
    student: Association<Attendance, User>;
    marker: Association<Attendance, User>;
  };
}

Attendance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sessions',
        key: 'id',
      },
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(AttendanceStatus)),
      allowNull: false,
    },
    isManual: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    markedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    markedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'attendances',
    timestamps: true,
  }
);

export default Attendance;

