import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Batch from './Batch';

export interface StudentSoftwareProgressAttributes {
  id: number;
  studentId: number;
  softwareName: string;
  softwareCode?: string | null; // e.g., "6", "7", "10", "12", etc. from Excel
  status: 'XX' | 'IP' | 'NO' | 'Finished'; // XX = Not started, IP = In Progress, NO = Not applicable, Finished = Completed
  enrollmentDate?: Date | null;
  courseName?: string | null; // e.g., "Graphics Advance", "Motion Graphics"
  courseType?: string | null; // e.g., "Regular"
  studentStatus?: string | null; // e.g., "Active", "A Plus"
  batchTiming?: string | null; // e.g., "7 to 9", "8 to 12"
  schedule?: string | null; // e.g., "MWF", "TTS"
  facultyName?: string | null;
  batchStartDate?: Date | null;
  batchEndDate?: Date | null;
  batchId?: number | null; // Link to actual batch if exists
  notes?: string | null;
  metadata?: Record<string, unknown> | null; // Store additional Excel data
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentSoftwareProgressCreationAttributes
  extends Optional<StudentSoftwareProgressAttributes, 'id' | 'softwareCode' | 'enrollmentDate' | 'courseName' | 'courseType' | 'studentStatus' | 'batchTiming' | 'schedule' | 'facultyName' | 'batchStartDate' | 'batchEndDate' | 'batchId' | 'notes' | 'metadata' | 'createdAt' | 'updatedAt'> {}

class StudentSoftwareProgress extends Model<StudentSoftwareProgressAttributes, StudentSoftwareProgressCreationAttributes> implements StudentSoftwareProgressAttributes {
  public id!: number;
  public studentId!: number;
  public softwareName!: string;
  public softwareCode!: string | null;
  public status!: 'XX' | 'IP' | 'NO' | 'Finished';
  public enrollmentDate!: Date | null;
  public courseName!: string | null;
  public courseType!: string | null;
  public studentStatus!: string | null;
  public batchTiming!: string | null;
  public schedule!: string | null;
  public facultyName!: string | null;
  public batchStartDate!: Date | null;
  public batchEndDate!: Date | null;
  public batchId!: number | null;
  public notes!: string | null;
  public metadata!: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getStudent!: BelongsToGetAssociationMixin<User>;
  public getBatch!: BelongsToGetAssociationMixin<Batch>;

  public static associations: {
    student: Association<StudentSoftwareProgress, User>;
    batch: Association<StudentSoftwareProgress, Batch>;
  };
}

StudentSoftwareProgress.init(
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
    softwareName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    softwareCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Software code from Excel (e.g., "6", "7", "10")',
    },
    status: {
      type: DataTypes.ENUM('XX', 'IP', 'NO', 'Finished'),
      allowNull: false,
      defaultValue: 'XX',
      comment: 'XX = Not started, IP = In Progress, NO = Not applicable, Finished = Completed',
    },
    enrollmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    courseName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    courseType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    studentStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    batchTiming: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    schedule: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    facultyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    batchStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    batchEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'batches',
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional Excel data stored as JSON',
    },
  },
  {
    sequelize,
    tableName: 'student_software_progress',
    timestamps: true,
    indexes: [
      {
        fields: ['studentId'],
      },
      {
        fields: ['softwareName'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['batchId'],
      },
      {
        unique: true,
        fields: ['studentId', 'softwareName'],
        name: 'unique_student_software',
      },
    ],
  }
);

export default StudentSoftwareProgress;






