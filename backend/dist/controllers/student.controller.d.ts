import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const bulkEnrollStudents: (req: AuthRequest & {
    file?: Express.Multer.File;
}, res: Response) => Promise<void>;
export declare const downloadEnrollmentTemplate: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=student.controller.d.ts.map