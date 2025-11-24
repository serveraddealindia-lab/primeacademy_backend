import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CreateExtensionBody {
    batchId: number;
    numberOfSessions: number;
    reason?: string;
}
interface ApproveExtensionParams {
    id: string;
}
interface ApproveExtensionBody {
    approve: boolean;
    rejectionReason?: string;
}
export declare const createExtension: (req: AuthRequest & {
    body: CreateExtensionBody;
}, res: Response) => Promise<void>;
export declare const getExtensions: (req: AuthRequest & {
    query: {
        batchId?: string;
        status?: string;
    };
}, res: Response) => Promise<void>;
export declare const approveExtension: (req: AuthRequest & {
    params: ApproveExtensionParams;
    body: ApproveExtensionBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=batchExtension.controller.d.ts.map