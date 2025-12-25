import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const createFaculty: (req: AuthRequest & {
    body: {
        userId: number;
        expertise?: string;
        availability?: string;
        documents?: any;
        softwareProficiency?: string;
    };
}, res: Response) => Promise<void>;
export declare const updateFacultyProfile: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: {
        expertise?: string;
        availability?: string;
    };
}, res: Response) => Promise<void>;
//# sourceMappingURL=faculty.controller.d.ts.map