import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Batch from './Batch';

export interface EnrollmentAttributes {
  id: number;
  studentId: number;
  batchId: number;
  enrollmentDate: Date;
  status: string | null;
  paymentPlan: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EnrollmentCreationAttributes
  extends Optional<EnrollmentAttributes, 'id' | 'status' | 'paymentPlan' | 'createdAt' | 'updatedAt'> {}

class Enrollment extends Model<EnrollmentAttributes, EnrollmentCreationAttributes> implements EnrollmentAttributes {
  public id!: number;
  public studentId!: number;
  public batchId!: number;
  public enrollmentDate!: Date;
  public status!: string | null;
  public paymentPlan!: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getStudent!: BelongsToGetAssociationMixin<User>;
  public getBatch!: BelongsToGetAssociationMixin<Batch>;

  public static associations: {
    student: Association<Enrollment, User>;
    batch: Association<Enrollment, Batch>;
  };
}

Enrollment.init(
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
    enrollmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentPlan: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'enrollments',
    timestamps: true,
  }
);

export default Enrollment;







