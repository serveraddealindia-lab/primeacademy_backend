import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
interface RegisterBody {
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    password: string;
}
interface LoginBody {
    email: string;
    password: string;
}
export declare const register: (req: Request<{}, {}, RegisterBody>, res: Response) => Promise<void>;
export declare const login: (req: Request<{}, {}, LoginBody>, res: Response) => Promise<void>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<void>;
export declare const impersonateUser: (req: AuthRequest & {
    params: {
        userId: string;
    };
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=auth.controller.d.ts.map