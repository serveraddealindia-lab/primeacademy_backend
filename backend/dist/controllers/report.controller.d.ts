import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface BatchAttendanceQuery {
    batchId?: string;
    from?: string;
    to?: string;
}
export declare const getAllStudents: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getStudentsWithoutBatch: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getBatchAttendance: (req: AuthRequest & {
    query: BatchAttendanceQuery;
}, res: Response) => Promise<void>;
export declare const getPendingPayments: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getPortfolioStatus: (_req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=report.controller.d.ts.map