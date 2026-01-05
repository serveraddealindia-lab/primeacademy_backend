import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface EmployeeProfileAttributes {
  id: number;
  userId: number;
  employeeId: string;
  gender: 'Male' | 'Female' | 'Other' | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  maritalStatus: 'Single' | 'Married' | 'Other' | null;
  department: string | null;
  designation: string | null;
  dateOfJoining: Date | null;
  employmentType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern' | null;
  reportingManager: string | null;
  workLocation: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  branch: string | null;
  panNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  documents: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmployeeProfileCreationAttributes
  extends Optional<
    EmployeeProfileAttributes,
    | 'id'
    | 'gender'
    | 'dateOfBirth'
    | 'nationality'
    | 'maritalStatus'
    | 'department'
    | 'designation'
    | 'dateOfJoining'
    | 'employmentType'
    | 'reportingManager'
    | 'workLocation'
    | 'bankName'
    | 'accountNumber'
    | 'ifscCode'
    | 'branch'
    | 'panNumber'
    | 'address'
    | 'city'
    | 'state'
    | 'postalCode'
    | 'documents'
    | 'createdAt'
    | 'updatedAt'
  > {}

class EmployeeProfile extends Model<EmployeeProfileAttributes, EmployeeProfileCreationAttributes> implements EmployeeProfileAttributes {
  public id!: number;
  public userId!: number;
  public employeeId!: string;
  public gender!: 'Male' | 'Female' | 'Other' | null;
  public dateOfBirth!: Date | null;
  public nationality!: string | null;
  public maritalStatus!: 'Single' | 'Married' | 'Other' | null;
  public department!: string | null;
  public designation!: string | null;
  public dateOfJoining!: Date | null;
  public employmentType!: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern' | null;
  public reportingManager!: string | null;
  public workLocation!: string | null;
  public bankName!: string | null;
  public accountNumber!: string | null;
  public ifscCode!: string | null;
  public branch!: string | null;
  public panNumber!: string | null;
  public address!: string | null;
  public city!: string | null;
  public state!: string | null;
  public postalCode!: string | null;
  public documents!: Record<string, any> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    user: Association<EmployeeProfile, User>;
  };
}

EmployeeProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    nationality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    maritalStatus: {
      type: DataTypes.ENUM('Single', 'Married', 'Other'),
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfJoining: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    employmentType: {
      type: DataTypes.ENUM('Full-Time', 'Part-Time', 'Contract', 'Intern'),
      allowNull: true,
    },
    reportingManager: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ifscCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    panNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documents: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'employee_profiles',
    timestamps: true,
  }
);

export default EmployeeProfile;








