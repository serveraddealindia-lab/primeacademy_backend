import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const createBatch: (req: AuthRequest, res: Response) => Promise<void>;
export declare const suggestCandidates: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getBatchEnrollments: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllBatches: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getBatchById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateBatch: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteBatch: (req: AuthRequest, res: Response) => Promise<void>;
export declare const assignFacultyToBatch: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=batch.controller.d.ts.map