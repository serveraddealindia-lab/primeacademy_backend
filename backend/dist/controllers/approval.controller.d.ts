import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CreateApprovalBody {
    entityType: string;
    entityId: number;
    reason?: string;
}
interface RespondToApprovalParams {
    id: string;
}
interface RespondToApprovalBody {
    approve: boolean;
}
export declare const createApproval: (req: AuthRequest & {
    body: CreateApprovalBody;
}, res: Response) => Promise<void>;
export declare const respondToApproval: (req: AuthRequest & {
    params: RespondToApprovalParams;
    body: RespondToApprovalBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=approval.controller.d.ts.map