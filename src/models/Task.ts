import { Model, DataTypes, Optional, Association, HasManyGetAssociationsMixin, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import TaskStudent from './TaskStudent';

export type TaskStatus = 'pending' | 'approved' | 'completed';

export interface TaskAttributes {
  id: number;
  facultyId: number;
  subject: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime?: string;
  workingHours?: number;
  status: TaskStatus;
  approvedBy: number | null;
  approvedAt: Date | null;
  startedAt?: Date | null;
  stoppedAt?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskCreationAttributes
  extends Optional<TaskAttributes, 'id' | 'status' | 'approvedBy' | 'approvedAt' | 'completedAt' | 'createdAt' | 'updatedAt'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public facultyId!: number;
  public subject!: string;
  public description?: string;
  public date!: Date;
  public startTime!: string;
  public endTime?: string;
  public workingHours?: number;
  public status!: TaskStatus;
  public approvedBy!: number | null;
  public approvedAt!: Date | null;
  public startedAt?: Date | null;
  public stoppedAt?: Date | null;
  public completedAt?: Date | null;
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
    description: { type: DataTypes.TEXT, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    startTime: { 
      type: DataTypes.TIME, 
      allowNull: false,
      field: 'time' // Map to 'time' column in database
    },
    endTime: { type: DataTypes.TIME, allowNull: true },
    workingHours: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    stoppedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
  }
);

export default Task;

