import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export * from './report.controller';
export declare const getStudentCurrentBatch: (req: AuthRequest & {
    params: {
        studentId: string;
    };
}, res: Response) => Promise<void>;
export declare const getStudentAttendance: (req: AuthRequest & {
    params: {
        studentId: string;
    };
    query: {
        from?: string;
        to?: string;
    };
}, res: Response) => Promise<void>;
export declare const getBatchesByFaculty: (req: AuthRequest & {
    query: {
        facultyId?: string;
        from?: string;
        to?: string;
    };
}, res: Response) => Promise<void>;
export declare const getMonthwisePayments: (req: AuthRequest & {
    query: {
        month?: string;
        year?: string;
    };
}, res: Response) => Promise<void>;
export declare const getAllAnalysisReports: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadReportCSV: (req: AuthRequest & {
    query: {
        type: string;
        [key: string]: string;
    };
}, res: Response) => Promise<void>;
//# sourceMappingURL=report-extended.controller.d.ts.map