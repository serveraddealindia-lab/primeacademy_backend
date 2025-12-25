import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getPayments: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPaymentById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createPayment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updatePayment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const generateReceipt: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadReceipt: (req: AuthRequest, res: Response) => Promise<void>;
export declare const bulkUploadPayments: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=payment.controller.d.ts.map