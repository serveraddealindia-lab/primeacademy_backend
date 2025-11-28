import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Batch from './Batch';

export enum PortfolioStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface PortfolioAttributes {
  id: number;
  studentId: number;
  batchId: number;
  files: Record<string, unknown> | null;
  pdfUrl: string | null;
  youtubeUrl: string | null;
  status: PortfolioStatus;
  approvedBy: number | null;
  approvedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PortfolioCreationAttributes
  extends Optional<PortfolioAttributes, 'id' | 'files' | 'status' | 'approvedBy' | 'approvedAt' | 'createdAt' | 'updatedAt'> {}

class Portfolio extends Model<PortfolioAttributes, PortfolioCreationAttributes> implements PortfolioAttributes {
  public id!: number;
  public studentId!: number;
  public batchId!: number;
  public files!: Record<string, unknown> | null;
  public pdfUrl!: string | null;
  public youtubeUrl!: string | null;
  public status!: PortfolioStatus;
  public approvedBy!: number | null;
  public approvedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getStudent!: BelongsToGetAssociationMixin<User>;
  public getBatch!: BelongsToGetAssociationMixin<Batch>;
  public getApprover!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    student: Association<Portfolio, User>;
    batch: Association<Portfolio, Batch>;
    approver: Association<Portfolio, User>;
  };
}

Portfolio.init(
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
    files: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    pdfUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    youtubeUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PortfolioStatus)),
      allowNull: false,
      defaultValue: PortfolioStatus.PENDING,
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'portfolios',
    timestamps: true,
  }
);

export default Portfolio;





