import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface PunchInBody {
    photo?: string;
    fingerprint?: string;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
}
interface PunchOutBody {
    photo?: string;
    fingerprint?: string;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
}
interface AddBreakBody {
    breakType: string;
    startTime: string;
    endTime?: string;
    reason: string;
}
export declare const punchIn: (req: AuthRequest & {
    body: PunchInBody;
}, res: Response) => Promise<void>;
export declare const punchOut: (req: AuthRequest & {
    body: PunchOutBody;
}, res: Response) => Promise<void>;
export declare const getTodayPunch: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getDailyLog: (req: AuthRequest & {
    query: {
        from?: string;
        to?: string;
        userId?: string;
    };
}, res: Response) => Promise<void>;
export declare const addBreak: (req: AuthRequest & {
    body: AddBreakBody;
}, res: Response) => Promise<void>;
export declare const endBreak: (req: AuthRequest & {
    params: {
        breakId: string;
    };
}, res: Response) => Promise<void>;
export declare const getAllEmployeesAttendance: (req: AuthRequest & {
    query: {
        from?: string;
        to?: string;
        userId?: string;
    };
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=employeeAttendance.controller.d.ts.map