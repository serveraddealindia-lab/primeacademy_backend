import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SessionStatus } from '../models/Session';
import { AttendanceStatus } from '../models/Attendance';
interface CreateSessionBody {
    batchId: number;
    facultyId: number;
    date: string;
    startTime: string;
    endTime: string;
    topic?: string;
    isBackup?: boolean;
}
interface CheckinParams {
    id: string;
}
interface CheckoutParams {
    id: string;
}
interface GetSessionsQuery {
    facultyId?: string;
    batchId?: string;
    status?: SessionStatus;
}
interface MarkAttendanceParams {
    id: string;
}
interface MarkAttendanceBody {
    studentId: number;
    status: AttendanceStatus;
    isManual?: boolean;
}
export declare const getSessions: (req: AuthRequest & {
    query: GetSessionsQuery;
}, res: Response) => Promise<void>;
export declare const createSession: (req: AuthRequest & {
    body: CreateSessionBody;
}, res: Response) => Promise<void>;
export declare const checkinSession: (req: AuthRequest & {
    params: CheckinParams;
}, res: Response) => Promise<void>;
export declare const checkoutSession: (req: AuthRequest & {
    params: CheckoutParams;
}, res: Response) => Promise<void>;
export declare const markAttendance: (req: AuthRequest & {
    params: MarkAttendanceParams;
    body: MarkAttendanceBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=session.controller.d.ts.map