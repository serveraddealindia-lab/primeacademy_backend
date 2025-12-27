import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface CourseAttributes {
  id: number;
  name: string; // Course name (e.g., "Graphics Beginner", "Video Editing")
  software: string[]; // Array of software names
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CourseCreationAttributes extends Optional<CourseAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Course extends Model<CourseAttributes, CourseCreationAttributes> implements CourseAttributes {
  public id!: number;
  public name!: string;
  public software!: string[];

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Course.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    software: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'courses',
    timestamps: true,
  }
);

export default Course;



