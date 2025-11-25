import {
  Model,
  DataTypes,
  Optional,
  BelongsToGetAssociationMixin,
  HasManyGetAssociationsMixin,
  Association,
} from 'sequelize';
import sequelize from '../config/database';
import Batch from './Batch';
import User from './User';
import Attendance from './Attendance';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export interface SessionAttributes {
  id: number;
  batchId: number;
  facultyId: number | null;
  date: Date;
  startTime: string;
  endTime: string;
  topic: string | null;
  isBackup: boolean;
  status: SessionStatus;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionCreationAttributes
  extends Optional<SessionAttributes, 'id' | 'facultyId' | 'topic' | 'isBackup' | 'status' | 'actualStartAt' | 'actualEndAt' | 'createdAt' | 'updatedAt'> {}

class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: number;
  public batchId!: number;
  public facultyId!: number | null;
  public date!: Date;
  public startTime!: string;
  public endTime!: string;
  public topic!: string | null;
  public isBackup!: boolean;
  public status!: SessionStatus;
  public actualStartAt!: Date | null;
  public actualEndAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getBatch!: BelongsToGetAssociationMixin<Batch>;
  public getFaculty!: BelongsToGetAssociationMixin<User>;
  public getAttendances!: HasManyGetAssociationsMixin<Attendance>;

  public static associations: {
    batch: Association<Session, Batch>;
    faculty: Association<Session, User>;
    attendances: Association<Session, Attendance>;
  };
}

Session.init(
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
    facultyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isBackup: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SessionStatus)),
      allowNull: false,
      defaultValue: SessionStatus.SCHEDULED,
    },
    actualStartAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actualEndAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'sessions',
    timestamps: true,
  }
);

export default Session;



