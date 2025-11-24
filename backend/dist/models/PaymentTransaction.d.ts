import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export declare enum PaymentStatus {
    PENDING = "pending",
    PARTIAL = "partial",
    PAID = "paid"
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
export interface PaymentTransactionCreationAttributes extends Optional<PaymentTransactionAttributes, 'id' | 'paidAt' | 'status' | 'receiptUrl' | 'createdAt' | 'updatedAt'> {
}
declare class PaymentTransaction extends Model<PaymentTransactionAttributes, PaymentTransactionCreationAttributes> implements PaymentTransactionAttributes {
    id: number;
    studentId: number;
    amount: number;
    paidAmount: number;
    dueDate: Date;
    paidAt: Date | null;
    status: PaymentStatus;
    receiptUrl: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getStudent: BelongsToGetAssociationMixin<User>;
    static associations: {
        student: Association<PaymentTransaction, User>;
    };
}
export default PaymentTransaction;
//# sourceMappingURL=PaymentTransaction.d.ts.map