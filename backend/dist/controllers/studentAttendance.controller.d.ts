import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const punchIn: (req: AuthRequest, res: Response) => Promise<void>;
export declare const punchOut: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTodayPunch: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStudentPunchHistory: (req: AuthRequest, res: Response) => Promise<void>;
declare const _default: {
    punchIn: (req: AuthRequest, res: Response) => Promise<void>;
    punchOut: (req: AuthRequest, res: Response) => Promise<void>;
    getTodayPunch: (req: AuthRequest, res: Response) => Promise<void>;
    getStudentPunchHistory: (req: AuthRequest, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=studentAttendance.controller.d.ts.map