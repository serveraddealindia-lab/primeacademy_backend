import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import BiometricDevice from './BiometricDevice';

export enum PunchType {
  IN = 'in',
  OUT = 'out',
}

export interface AttendanceLogAttributes {
  id: number;
  employeeId: number;
  deviceId: number;
  punchTime: Date;
  punchType: PunchType;
  rawPayload: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttendanceLogCreationAttributes
  extends Optional<AttendanceLogAttributes, 'id' | 'rawPayload' | 'createdAt' | 'updatedAt'> {}

class AttendanceLog extends Model<AttendanceLogAttributes, AttendanceLogCreationAttributes>
  implements AttendanceLogAttributes {
  public id!: number;
  public employeeId!: number;
  public deviceId!: number;
  public punchTime!: Date;
  public punchType!: PunchType;
  public rawPayload!: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public getDevice!: BelongsToGetAssociationMixin<BiometricDevice>;

  public static associations: {
    user: Association<AttendanceLog, User>;
    device: Association<AttendanceLog, BiometricDevice>;
  };
}

AttendanceLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'biometric_devices',
        key: 'id',
      },
    },
    punchTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    punchType: {
      type: DataTypes.ENUM(...Object.values(PunchType)),
      allowNull: false,
    },
    rawPayload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'attendance_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['employeeId', 'punchTime'],
      },
      {
        fields: ['deviceId'],
      },
    ],
  }
);

export default AttendanceLog;



