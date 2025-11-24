import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PaymentStatus } from '../models/PaymentTransaction';
interface CreatePaymentBody {
    studentId: number;
    amount: number;
    dueDate: string;
    status?: PaymentStatus;
    receiptUrl?: string;
    initialPaidAmount?: number;
}
interface GetStudentPaymentsParams {
    id: string;
}
interface GetPaymentsQuery {
    status?: PaymentStatus;
    studentId?: string;
}
interface RecordPaymentParams {
    id: string;
}
interface RecordPaymentBody {
    amountPaid: number;
    receiptUrl?: string;
}
export declare const createPayment: (req: AuthRequest & {
    body: CreatePaymentBody;
}, res: Response) => Promise<void>;
export declare const getStudentPayments: (req: AuthRequest & {
    params: GetStudentPaymentsParams;
}, res: Response) => Promise<void>;
export declare const getAllPayments: (req: AuthRequest & {
    query: GetPaymentsQuery;
}, res: Response) => Promise<void>;
export declare const recordPayment: (req: AuthRequest & {
    params: RecordPaymentParams;
    body: RecordPaymentBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=payment.controller.d.ts.map