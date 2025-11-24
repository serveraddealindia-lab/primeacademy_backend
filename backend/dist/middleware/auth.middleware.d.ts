import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../utils/jwt';
import { UserRole } from '../models/User';
export interface AuthRequest extends Request {
    user?: JWTPayload;
}
export declare const verifyTokenMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const checkRole: (...allowedRoles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireAuth: (allowedRoles?: UserRole[]) => ((req: AuthRequest, res: Response, next: NextFunction) => void)[];
//# sourceMappingURL=auth.middleware.d.ts.map