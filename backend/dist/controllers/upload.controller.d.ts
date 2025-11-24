import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const uploadFiles: (req: AuthRequest & {
    files?: Express.Multer.File[] | {
        [fieldname: string]: Express.Multer.File[];
    };
}, res: Response) => Promise<void>;
//# sourceMappingURL=upload.controller.d.ts.map