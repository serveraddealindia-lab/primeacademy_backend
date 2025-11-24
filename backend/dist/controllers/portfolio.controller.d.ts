import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface UploadPortfolioParams {
    id: string;
}
interface UploadPortfolioBody {
    batchId: number;
    files?: string[];
    pdfUrl?: string;
    youtubeUrl?: string;
}
interface ApprovePortfolioParams {
    id: string;
}
interface ApprovePortfolioBody {
    approve: boolean;
}
export declare const uploadPortfolio: (req: AuthRequest & {
    params: UploadPortfolioParams;
    body: UploadPortfolioBody;
}, res: Response) => Promise<void>;
export declare const approvePortfolio: (req: AuthRequest & {
    params: ApprovePortfolioParams;
    body: ApprovePortfolioBody;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=portfolio.controller.d.ts.map