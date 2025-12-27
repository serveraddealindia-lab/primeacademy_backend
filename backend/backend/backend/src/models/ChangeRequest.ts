import {
  Model,
  DataTypes,
  Optional,
  BelongsToGetAssociationMixin,
  Association,
} from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export enum ChangeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ChangeRequestAttributes {
  id: number;
  entityType: string;
  entityId: number;
  requestedBy: number;
  approverId: number | null;
  status: ChangeRequestStatus;
  reason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChangeRequestCreationAttributes extends Optional<ChangeRequestAttributes, 'id' | 'approverId' | 'status' | 'reason' | 'createdAt' | 'updatedAt'> {}

class ChangeRequest extends Model<ChangeRequestAttributes, ChangeRequestCreationAttributes> implements ChangeRequestAttributes {
  public id!: number;
  public entityType!: string;
  public entityId!: number;
  public requestedBy!: number;
  public approverId!: number | null;
  public status!: ChangeRequestStatus;
  public reason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public getRequester!: BelongsToGetAssociationMixin<User>;
  public getApprover!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    requester: Association<ChangeRequest, User>;
    approver: Association<ChangeRequest, User>;
  };
}

ChangeRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ChangeRequestStatus)),
      allowNull: false,
      defaultValue: ChangeRequestStatus.PENDING,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'change_requests',
    timestamps: true,
  }
);

export default ChangeRequest;

