import { Request, Response, NextFunction } from 'express';
export interface CustomError extends Error {
    status?: number;
    statusCode?: number;
}
export declare const errorHandler: (err: CustomError, _req: Request, res: Response, _next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=error.middleware.d.ts.map