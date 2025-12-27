import {
  Model,
  DataTypes,
  Optional,
  BelongsToGetAssociationMixin,
  Association,
} from 'sequelize';
import sequelize from '../config/database';
import Role from './Role';

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
  EMPLOYEE_LEAVES = 'employee_leaves',
  FACULTY_LEAVES = 'faculty_leaves',
}

export interface RolePermissionAttributes {
  id: number;
  roleId: number;
  module: Module;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, 'id' | 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'createdAt' | 'updatedAt'> {}

class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
  public id!: number;
  public roleId!: number;
  public module!: Module;
  public canView!: boolean;
  public canAdd!: boolean;
  public canEdit!: boolean;
  public canDelete!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public getRole!: BelongsToGetAssociationMixin<Role>;

  public static associations: {
    role: Association<RolePermission, Role>;
  };
}

RolePermission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    module: {
      type: DataTypes.ENUM(...Object.values(Module)),
      allowNull: false,
    },
    canView: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canAdd: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canEdit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['roleId', 'module'],
      },
    ],
  }
);

export default RolePermission;

