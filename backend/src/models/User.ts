import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import type StudentProfile from './StudentProfile';
import type FacultyProfile from './FacultyProfile';
import type EmployeeProfile from './EmployeeProfile';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  FACULTY = 'faculty',
  STUDENT = 'student',
  EMPLOYEE = 'employee',
}

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  passwordHash: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'phone' | 'avatarUrl' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public role!: UserRole;
  public passwordHash!: string;
  public avatarUrl!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public studentProfile?: StudentProfile;
  public facultyProfile?: FacultyProfile;
  public employeeProfile?: EmployeeProfile;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
);

export default User;




