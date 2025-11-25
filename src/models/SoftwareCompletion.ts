import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Batch from './Batch';

export enum SoftwareCompletionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface SoftwareCompletionAttributes {
  id: number;
  studentId: number;
  batchId: number;
  softwareName: string;
  startDate: Date;
  endDate: Date;
  facultyId: number | null;
  status: SoftwareCompletionStatus;
  completedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SoftwareCompletionCreationAttributes
  extends Optional<SoftwareCompletionAttributes, 'id' | 'facultyId' | 'status' | 'completedAt' | 'createdAt' | 'updatedAt'> {}

class SoftwareCompletion
  extends Model<SoftwareCompletionAttributes, SoftwareCompletionCreationAttributes>
  implements SoftwareCompletionAttributes
{
  public id!: number;
  public studentId!: number;
  public batchId!: number;
  public softwareName!: string;
  public startDate!: Date;
  public endDate!: Date;
  public facultyId!: number | null;
  public status!: SoftwareCompletionStatus;
  public completedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getStudent!: BelongsToGetAssociationMixin<User>;
  public getBatch!: BelongsToGetAssociationMixin<Batch>;
  public getFaculty!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    student: Association<SoftwareCompletion, User>;
    batch: Association<SoftwareCompletion, Batch>;
    faculty: Association<SoftwareCompletion, User>;
  };
}

SoftwareCompletion.init(
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
    softwareName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    facultyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SoftwareCompletionStatus)),
      allowNull: false,
      defaultValue: SoftwareCompletionStatus.IN_PROGRESS,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'software_completions',
    timestamps: true,
  }
);

export default SoftwareCompletion;



