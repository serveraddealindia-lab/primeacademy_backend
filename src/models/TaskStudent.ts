import { Model, DataTypes, Optional, Association, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import Task from './Task';
import User from './User';

export type TaskAttendanceStatus = 'A' | 'P' | 'LATE' | 'ONLINE';

export interface TaskStudentAttributes {
  id: number;
  taskId: number;
  studentId: number;
  attendanceStatus: TaskAttendanceStatus | null;
  markedBy: number | null;
  markedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskStudentCreationAttributes
  extends Optional<TaskStudentAttributes, 'id' | 'attendanceStatus' | 'markedBy' | 'markedAt' | 'createdAt' | 'updatedAt'> {}

class TaskStudent
  extends Model<TaskStudentAttributes, TaskStudentCreationAttributes>
  implements TaskStudentAttributes
{
  public id!: number;
  public taskId!: number;
  public studentId!: number;
  public attendanceStatus!: TaskAttendanceStatus | null;
  public markedBy!: number | null;
  public markedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getTask!: BelongsToGetAssociationMixin<Task>;
  public getStudent!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    task: Association<TaskStudent, Task>;
    student: Association<TaskStudent, User>;
  };
}

TaskStudent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    taskId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    attendanceStatus: { type: DataTypes.ENUM('A', 'P', 'LATE', 'ONLINE'), allowNull: true },
    markedBy: { type: DataTypes.INTEGER, allowNull: true },
    markedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'task_students',
    timestamps: true,
    indexes: [{ unique: true, fields: ['taskId', 'studentId'] }],
  }
);

export default TaskStudent;

