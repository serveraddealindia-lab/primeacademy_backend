import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum DeviceType {
  PUSH_API = 'push-api',
  PULL_API = 'pull-api',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface BiometricDeviceAttributes {
  id: number;
  deviceName: string;
  deviceType: DeviceType;
  ipAddress: string | null;
  port: number | null;
  apiUrl: string | null;
  authKey: string | null;
  lastSyncAt: Date | null;
  status: DeviceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BiometricDeviceCreationAttributes
  extends Optional<
    BiometricDeviceAttributes,
    'id' | 'ipAddress' | 'port' | 'apiUrl' | 'authKey' | 'lastSyncAt' | 'status' | 'createdAt' | 'updatedAt'
  > {}

class BiometricDevice extends Model<BiometricDeviceAttributes, BiometricDeviceCreationAttributes>
  implements BiometricDeviceAttributes {
  public id!: number;
  public deviceName!: string;
  public deviceType!: DeviceType;
  public ipAddress!: string | null;
  public port!: number | null;
  public apiUrl!: string | null;
  public authKey!: string | null;
  public lastSyncAt!: Date | null;
  public status!: DeviceStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BiometricDevice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deviceType: {
      type: DataTypes.ENUM(...Object.values(DeviceType)),
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    apiUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    authKey: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DeviceStatus)),
      allowNull: false,
      defaultValue: DeviceStatus.INACTIVE,
    },
  },
  {
    sequelize,
    tableName: 'biometric_devices',
    timestamps: true,
  }
);

export default BiometricDevice;




