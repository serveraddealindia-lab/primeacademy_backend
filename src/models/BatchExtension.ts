import {
  Model,
  DataTypes,
  Optional,
  BelongsToGetAssociationMixin,
  Association,
} from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Batch from './Batch';

export enum ExtensionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface BatchExtensionAttributes {
  id: number;
  batchId: number;
  requestedBy: number;
  numberOfSessions: number;
  reason: string | null;
  status: ExtensionStatus;
  approvedBy: number | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BatchExtensionCreationAttributes extends Optional<BatchExtensionAttributes, 'id' | 'reason' | 'status' | 'approvedBy' | 'approvedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {}

class BatchExtension extends Model<BatchExtensionAttributes, BatchExtensionCreationAttributes> implements BatchExtensionAttributes {
  public id!: number;
  public batchId!: number;
  public requestedBy!: number;
  public numberOfSessions!: number;
  public reason!: string | null;
  public status!: ExtensionStatus;
  public approvedBy!: number | null;
  public approvedAt!: Date | null;
  public rejectionReason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public getBatch!: BelongsToGetAssociationMixin<Batch>;
  public getRequester!: BelongsToGetAssociationMixin<User>;
  public getApprover!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    batch: Association<BatchExtension, Batch>;
    requester: Association<BatchExtension, User>;
    approver: Association<BatchExtension, User>;
  };
}

BatchExtension.init(
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
    },
    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    numberOfSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ExtensionStatus)),
      allowNull: false,
      defaultValue: ExtensionStatus.PENDING,
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
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'batch_extensions',
    timestamps: true,
  }
);

export default BatchExtension;






