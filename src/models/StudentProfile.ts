import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface StudentProfileAttributes {
  id: number;
  userId: number;
  dob: Date | null;
  address: string | null;
  documents: Record<string, unknown> | null;
  photoUrl: string | null;
  softwareList: string[] | null;
  enrollmentDate: Date | null;
  status: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentProfileCreationAttributes
  extends Optional<
    StudentProfileAttributes,
    'id' | 'dob' | 'address' | 'documents' | 'photoUrl' | 'softwareList' | 'enrollmentDate' | 'status' | 'createdAt' | 'updatedAt'
  > {}

class StudentProfile extends Model<StudentProfileAttributes, StudentProfileCreationAttributes> implements StudentProfileAttributes {
  public id!: number;
  public userId!: number;
  public dob!: Date | null;
  public address!: string | null;
  public documents!: Record<string, unknown> | null;
  public photoUrl!: string | null;
  public softwareList!: string[] | null;
  public enrollmentDate!: Date | null;
  public status!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    user: Association<StudentProfile, User>;
  };
}

StudentProfile.init(
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
    dob: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    documents: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    softwareList: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    enrollmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'student_profiles',
    timestamps: true,
  }
);

export default StudentProfile;







