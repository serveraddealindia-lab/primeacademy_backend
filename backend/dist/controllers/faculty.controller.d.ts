import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CreateFacultyBody {
    userId: number;
    expertise?: Record<string, any>;
    availability?: Record<string, any>;
}
export declare const createFaculty: (req: AuthRequest & {
    body: CreateFacultyBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=faculty.controller.d.ts.map