import { Model, DataTypes, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export enum Module {
  BATCHES = 'batches',
  STUDENTS = 'students',
  FACULTY = 'faculty',
  EMPLOYEES = 'employees',
  SESSIONS = 'sessions',
  ATTENDANCE = 'attendance',
  PAYMENTS = 'payments',
  PORTFOLIOS = 'portfolios',
  REPORTS = 'reports',
  APPROVALS = 'approvals',
  USERS = 'users',
  SOFTWARE_COMPLETIONS = 'software_completions',
  STUDENT_LEAVES = 'student_leaves',
  BATCH_EXTENSIONS = 'batch_extensions',
}

export interface PermissionAttributes {
  id: number;
  userId: number;
  module: Module;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PermissionCreationAttributes
  extends Optional<PermissionAttributes, 'id' | 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'createdAt' | 'updatedAt'> {}

class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public id!: number;
  public userId!: number;
  public module!: Module;
  public canView!: boolean;
  public canAdd!: boolean;
  public canEdit!: boolean;
  public canDelete!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    module: {
      type: DataTypes.ENUM(...Object.values(Module)),
      allowNull: false,
    },
    canView: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canAdd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canEdit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'permissions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'module'],
      },
    ],
  }
);

export default Permission;



