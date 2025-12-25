import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CreateCompletionBody {
    studentId: number;
    batchId: number;
    softwareName: string;
    startDate: string;
    endDate: string;
    facultyId: number;
}
interface UpdateCompletionParams {
    id: string;
}
interface UpdateCompletionBody {
    status?: 'in_progress' | 'completed';
    endDate?: string;
}
export declare const createCompletion: (req: AuthRequest & {
    body: CreateCompletionBody;
}, res: Response) => Promise<void>;
export declare const getCompletions: (req: AuthRequest & {
    query: {
        studentId?: string;
        batchId?: string;
        facultyId?: string;
        status?: string;
    };
}, res: Response) => Promise<void>;
export declare const updateCompletion: (req: AuthRequest & {
    params: UpdateCompletionParams;
    body: UpdateCompletionBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=softwareCompletion.controller.d.ts.map