import { Model, DataTypes, Optional, Association } from 'sequelize';
import sequelize from '../config/database';
import Session from './Session';
import User from './User';

export interface AttendanceDraftAttributes {
  id: number;
  sessionId: number;
  facultyId: number;
  payload: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttendanceDraftCreationAttributes
  extends Optional<AttendanceDraftAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class AttendanceDraft
  extends Model<AttendanceDraftAttributes, AttendanceDraftCreationAttributes>
  implements AttendanceDraftAttributes
{
  public id!: number;
  public sessionId!: number;
  public facultyId!: number;
  public payload!: unknown;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associations: {
    session: Association<AttendanceDraft, Session>;
    faculty: Association<AttendanceDraft, User>;
  };
}

AttendanceDraft.init(
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
    facultyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    payload: {
      // JSON is supported by MySQL 5.7+; Sequelize maps appropriately
      type: (DataTypes as any).JSON ? (DataTypes as any).JSON : DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'attendance_drafts',
    timestamps: true,
    indexes: [{ unique: true, fields: ['sessionId', 'facultyId'] }],
  }
);

export default AttendanceDraft;

