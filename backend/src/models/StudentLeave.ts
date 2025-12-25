import {
  Model,
  DataTypes,
  Optional,
  BelongsToGetAssociationMixin,
  Association,
} from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Batch from './Batch';

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface StudentLeaveAttributes {
  id: number;
  studentId: number;
  batchId: number;
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

export interface StudentLeaveCreationAttributes extends Optional<StudentLeaveAttributes, 'id' | 'reason' | 'status' | 'approvedBy' | 'approvedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {}

class StudentLeave extends Model<StudentLeaveAttributes, StudentLeaveCreationAttributes> implements StudentLeaveAttributes {
  public id!: number;
  public studentId!: number;
  public batchId!: number;
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
  public getStudent!: BelongsToGetAssociationMixin<User>;
  public getBatch!: BelongsToGetAssociationMixin<Batch>;
  public getApprover!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    student: Association<StudentLeave, User>;
    batch: Association<StudentLeave, Batch>;
    approver: Association<StudentLeave, User>;
  };
}

StudentLeave.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'batches',
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
    tableName: 'student_leaves',
    timestamps: true,
  }
);

export default StudentLeave;






