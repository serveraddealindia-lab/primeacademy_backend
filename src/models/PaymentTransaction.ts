import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface PaymentTransactionAttributes {
  id: number;
  studentId: number;
  enrollmentId?: number | null;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentStatus;
  receiptUrl: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentTransactionCreationAttributes
  extends Optional<
    PaymentTransactionAttributes,
    | 'id'
    | 'paidAt'
    | 'status'
    | 'receiptUrl'
    | 'createdAt'
    | 'updatedAt'
    | 'paidAmount'
    | 'enrollmentId'
    | 'paymentMethod'
    | 'transactionId'
    | 'notes'
  > {}

class PaymentTransaction
  extends Model<PaymentTransactionAttributes, PaymentTransactionCreationAttributes>
  implements PaymentTransactionAttributes
{
  public id!: number;
  public studentId!: number;
  public enrollmentId!: number | null;
  public amount!: number;
  public paidAmount!: number;
  public dueDate!: Date;
  public paidAt!: Date | null;
  public status!: PaymentStatus;
  public receiptUrl!: string | null;
  public paymentMethod!: string | null;
  public transactionId!: string | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getStudent!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    student: Association<PaymentTransaction, User>;
  };
}

PaymentTransaction.init(
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
    },
    enrollmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'enrollments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.PENDING,
    },
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'payment_transactions',
    timestamps: true,
  }
);

export default PaymentTransaction;





