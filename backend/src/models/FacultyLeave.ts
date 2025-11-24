import {
  Model,
  DataTypes,
  Optional,
  BelongsToGetAssociationMixin,
  Association,
} from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface FacultyLeaveAttributes {
  id: number;
  facultyId: number;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: LeaveStatus;
  approvedBy: number | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FacultyLeaveCreationAttributes extends Optional<FacultyLeaveAttributes, 'id' | 'reason' | 'status' | 'approvedBy' | 'approvedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {}

class FacultyLeave extends Model<FacultyLeaveAttributes, FacultyLeaveCreationAttributes> implements FacultyLeaveAttributes {
  public id!: number;
  public facultyId!: number;
  public startDate!: Date;
  public endDate!: Date;
  public reason!: string | null;
  public status!: LeaveStatus;
  public approvedBy!: number | null;
  public approvedAt!: Date | null;
  public rejectionReason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public getFaculty!: BelongsToGetAssociationMixin<User>;
  public getApprover!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    faculty: Association<FacultyLeave, User>;
    approver: Association<FacultyLeave, User>;
  };
}

FacultyLeave.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    facultyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(LeaveStatus)),
      allowNull: false,
      defaultValue: LeaveStatus.PENDING,
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'faculty_leaves',
    timestamps: true,
  }
);

export default FacultyLeave;



