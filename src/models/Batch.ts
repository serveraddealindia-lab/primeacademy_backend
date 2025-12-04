import {
  Model,
  DataTypes,
  Optional,
} from 'sequelize';
import sequelize from '../config/database';

export enum BatchMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
  HYBRID = 'hybrid',
}

export interface BatchAttributes {
  id: number;
  title: string;
  software: string | null;
  mode: BatchMode;
  startDate: Date;
  endDate: Date;
  maxCapacity: number;
  schedule: any | null;
  createdByAdminId: number | null;
  status: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BatchCreationAttributes extends Optional<BatchAttributes, 'id' | 'software' | 'schedule' | 'createdByAdminId' | 'status' | 'createdAt' | 'updatedAt'> {}

class Batch extends Model<BatchAttributes, BatchCreationAttributes> implements BatchAttributes {
  public id!: number;
  public title!: string;
  public software!: string | null;
  public mode!: BatchMode;
  public startDate!: Date;
  public endDate!: Date;
  public maxCapacity!: number;
  public schedule!: any | null;
  public createdByAdminId!: number | null;
  public status!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Batch.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    software: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mode: {
      type: DataTypes.ENUM(...Object.values(BatchMode)),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    maxCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    schedule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    createdByAdminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'batches',
    timestamps: true,
  }
);

export default Batch;










