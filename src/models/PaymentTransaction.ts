import { Model, DataTypes, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export interface PaymentTransactionAttributes {
  id: number;
  studentId: number;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentStatus;
  receiptUrl: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentTransactionCreationAttributes
  extends Optional<PaymentTransactionAttributes, 'id' | 'paidAt' | 'status' | 'receiptUrl' | 'createdAt' | 'updatedAt'> {}

class PaymentTransaction
  extends Model<PaymentTransactionAttributes, PaymentTransactionCreationAttributes>
  implements PaymentTransactionAttributes
{
  public id!: number;
  public studentId!: number;
  public amount!: number;
  public paidAmount!: number;
  public dueDate!: Date;
  public paidAt!: Date | null;
  public status!: PaymentStatus;
  public receiptUrl!: string | null;
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
  },
  {
    sequelize,
    tableName: 'payment_transactions',
    timestamps: true,
  }
);

export default PaymentTransaction;



