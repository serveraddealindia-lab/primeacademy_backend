import { Model, DataTypes, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import Batch from './Batch';
import User from './User';

export interface BatchFacultyAssignmentAttributes {
  id: number;
  batchId: number;
  facultyId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BatchFacultyAssignmentCreationAttributes
  extends Optional<BatchFacultyAssignmentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class BatchFacultyAssignment
  extends Model<BatchFacultyAssignmentAttributes, BatchFacultyAssignmentCreationAttributes>
  implements BatchFacultyAssignmentAttributes
{
  public id!: number;
  public batchId!: number;
  public facultyId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getBatch!: BelongsToGetAssociationMixin<Batch>;
  public getFaculty!: BelongsToGetAssociationMixin<User>;
}

BatchFacultyAssignment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'batches',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    facultyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'batch_faculty_assignments',
    timestamps: true,
  }
);

export default BatchFacultyAssignment;







