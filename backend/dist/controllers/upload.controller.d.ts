import { Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const uploadMiddleware: multer.Multer;
export declare const uploadFiles: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=upload.controller.d.ts.map