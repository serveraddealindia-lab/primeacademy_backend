import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
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

export interface EmployeePunchCreationAttributes
  extends Optional<
    EmployeePunchAttributes,
    | 'id'
    | 'punchInAt'
    | 'punchOutAt'
    | 'punchInPhoto'
    | 'punchOutPhoto'
    | 'punchInFingerprint'
    | 'punchOutFingerprint'
    | 'punchInLocation'
    | 'punchOutLocation'
    | 'breaks'
    | 'effectiveWorkingHours'
    | 'createdAt'
    | 'updatedAt'
  > {}

class EmployeePunch extends Model<EmployeePunchAttributes, EmployeePunchCreationAttributes> implements EmployeePunchAttributes {
  public id!: number;
  public userId!: number;
  public date!: string;
  public punchInAt!: Date | null;
  public punchOutAt!: Date | null;
  public punchInPhoto!: string | null;
  public punchOutPhoto!: string | null;
  public punchInFingerprint!: string | null;
  public punchOutFingerprint!: string | null;
  public punchInLocation!: Record<string, unknown> | null;
  public punchOutLocation!: Record<string, unknown> | null;
  public breaks!: Record<string, unknown>[] | Record<string, unknown> | null;
  public effectiveWorkingHours!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    user: Association<EmployeePunch, User>;
  };
}

EmployeePunch.init(
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
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    punchInAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    punchOutAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    breaks: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    punchInPhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    punchOutPhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    punchInFingerprint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    punchOutFingerprint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    punchInLocation: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    punchOutLocation: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    effectiveWorkingHours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'employee_punches',
    timestamps: true,
  }
);

export default EmployeePunch;


