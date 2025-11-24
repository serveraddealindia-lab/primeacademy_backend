import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CreateLeaveBody {
    employeeId: number;
    startDate: string;
    endDate: string;
    reason?: string;
}
interface ApproveLeaveParams {
    id: string;
}
interface ApproveLeaveBody {
    approve: boolean;
    rejectionReason?: string;
}
export declare const createLeave: (req: AuthRequest & {
    body: CreateLeaveBody;
}, res: Response) => Promise<void>;
export declare const getLeaves: (req: AuthRequest & {
    query: {
        employeeId?: string;
        status?: string;
    };
}, res: Response) => Promise<void>;
export declare const approveLeave: (req: AuthRequest & {
    params: ApproveLeaveParams;
    body: ApproveLeaveBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=employeeLeave.controller.d.ts.map