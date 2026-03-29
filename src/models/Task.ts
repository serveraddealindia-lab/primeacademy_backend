import { Model, DataTypes, Optional, Association, HasManyGetAssociationsMixin, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import TaskStudent from './TaskStudent';

export type TaskStatus = 'pending' | 'approved' | 'completed';

export interface TaskAttributes {
  id: number;
  facultyId: number;
  subject: string;
  date: Date;
  time: string;
  status: TaskStatus;
  approvedBy: number | null;
  approvedAt: Date | null;
  completedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskCreationAttributes
  extends Optional<TaskAttributes, 'id' | 'status' | 'approvedBy' | 'approvedAt' | 'completedAt' | 'createdAt' | 'updatedAt'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public facultyId!: number;
  public subject!: string;
  public date!: Date;
  public time!: string;
  public status!: TaskStatus;
  public approvedBy!: number | null;
  public approvedAt!: Date | null;
  public completedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getFaculty!: BelongsToGetAssociationMixin<User>;
  public getApprovedByUser!: BelongsToGetAssociationMixin<User>;
  public getStudents!: HasManyGetAssociationsMixin<TaskStudent>;

  public static associations: {
    faculty: Association<Task, User>;
    approver: Association<Task, User>;
    taskStudents: Association<Task, TaskStudent>;
  };
}

Task.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    facultyId: { type: DataTypes.INTEGER, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.TIME, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
  }
);

export default Task;

