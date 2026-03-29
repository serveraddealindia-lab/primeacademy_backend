import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ReportAttributes {
  id: number;
  reportType: string;
  reportName: string;
  generatedBy: number;
  parameters?: Record<string, any>;
  data: Record<string, any>;
  summary?: Record<string, any>;
  recordCount?: number;
  fileUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ReportCreationAttributes extends Optional<ReportAttributes, 'id' | 'createdAt' | 'updatedAt' | 'parameters' | 'summary' | 'recordCount' | 'fileUrl' | 'errorMessage'> {}

class Report extends Model<ReportAttributes, ReportCreationAttributes> implements ReportAttributes {
  public id!: number;
  public reportType!: string;
  public reportName!: string;
  public generatedBy!: number;
  public parameters?: Record<string, any>;
  public data!: Record<string, any>;
  public summary?: Record<string, any>;
  public recordCount?: number;
  public fileUrl?: string;
  public status!: 'pending' | 'completed' | 'failed';
  public errorMessage?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Report.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reportType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type of report (e.g., batch-attendance, pending-payments)',
    },
    reportName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Human-readable report name',
    },
    generatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'User ID who generated the report',
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Query parameters used for generating the report',
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Complete report data',
    },
    summary: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Summary statistics of the report',
    },
    recordCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Number of records in the report',
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL to exported file if any (CSV, PDF, etc.)',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'completed',
      comment: 'Report generation status',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if report generation failed',
    },
  },
  {
    sequelize,
    tableName: 'reports',
    timestamps: true,
    indexes: [
      { fields: ['reportType'] },
      { fields: ['generatedBy'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default Report;
