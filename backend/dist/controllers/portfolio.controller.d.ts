import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CreatePortfolioBody {
    batchId: number;
    files?: string[];
    pdfUrl?: string;
    youtubeUrl?: string;
}
interface ApprovePortfolioBody {
    approve: boolean;
}
export declare const getAllPortfolios: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStudentPortfolio: (req: AuthRequest, res: Response) => Promise<void>;
export declare const uploadPortfolio: (req: AuthRequest & {
    body: CreatePortfolioBody;
}, res: Response) => Promise<void>;
export declare const approvePortfolio: (req: AuthRequest & {
    body: ApprovePortfolioBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=portfolio.controller.d.ts.map