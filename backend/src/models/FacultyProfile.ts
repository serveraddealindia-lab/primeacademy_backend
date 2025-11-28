import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface FacultyProfileAttributes {
  id: number;
  userId: number;
  expertise: Record<string, unknown> | null;
  availability: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FacultyProfileCreationAttributes
  extends Optional<FacultyProfileAttributes, 'id' | 'expertise' | 'availability' | 'createdAt' | 'updatedAt'> {}

class FacultyProfile extends Model<FacultyProfileAttributes, FacultyProfileCreationAttributes> implements FacultyProfileAttributes {
  public id!: number;
  public userId!: number;
  public expertise!: Record<string, unknown> | null;
  public availability!: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    user: Association<FacultyProfile, User>;
  };
}

FacultyProfile.init(
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
    expertise: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    availability: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'faculty_profiles',
    timestamps: true,
  }
);

export default FacultyProfile;





