import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export enum OrientationLanguage {
  ENGLISH = 'english',
  GUJARATI = 'gujarati',
}

export interface StudentOrientationAttributes {
  id: number;
  studentId: number;
  language: OrientationLanguage;
  accepted: boolean;
  acceptedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentOrientationCreationAttributes
  extends Optional<
    StudentOrientationAttributes,
    'id' | 'accepted' | 'acceptedAt' | 'createdAt' | 'updatedAt'
  > {}

class StudentOrientation
  extends Model<StudentOrientationAttributes, StudentOrientationCreationAttributes>
  implements StudentOrientationAttributes
{
  public id!: number;
  public studentId!: number;
  public language!: OrientationLanguage;
  public accepted!: boolean;
  public acceptedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getStudent!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    student: Association<StudentOrientation, User>;
  };
}

StudentOrientation.init(
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    language: {
      type: DataTypes.ENUM(...Object.values(OrientationLanguage)),
      allowNull: false,
    },
    accepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'student_orientations',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['studentId', 'language'],
        name: 'unique_student_language',
      },
    ],
  }
);

export default StudentOrientation;


