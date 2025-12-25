import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getFacultyAssignmentsDebug: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFacultyAssignedBatches: (req: AuthRequest, res: Response) => Promise<void>;
export declare const startSession: (req: AuthRequest, res: Response) => Promise<void>;
export declare const endSession: (req: AuthRequest, res: Response) => Promise<void>;
export declare const submitSessionAttendance: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getBatchHistory: (req: AuthRequest, res: Response) => Promise<void>;
declare const _default: {
    getFacultyAssignedBatches: (req: AuthRequest, res: Response) => Promise<void>;
    getFacultyAssignmentsDebug: (req: AuthRequest, res: Response) => Promise<void>;
    startSession: (req: AuthRequest, res: Response) => Promise<void>;
    endSession: (req: AuthRequest, res: Response) => Promise<void>;
    submitSessionAttendance: (req: AuthRequest, res: Response) => Promise<void>;
    getBatchHistory: (req: AuthRequest, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=session.controller.d.ts.map