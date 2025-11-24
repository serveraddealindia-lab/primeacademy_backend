import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getAllUsers: (req: AuthRequest & {
    query: {
        role?: string;
        isActive?: string;
        page?: string;
        limit?: string;
    };
}, res: Response) => Promise<void>;
export declare const getUserById: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
export declare const updateUser: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: {
        name?: string;
        email?: string;
        phone?: string;
        role?: string;
        isActive?: boolean;
        avatarUrl?: string;
    };
}, res: Response) => Promise<void>;
export declare const deleteUser: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
export declare const updateStudentProfile: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: {
        dob?: string;
        address?: string;
        photoUrl?: string;
        softwareList?: string[];
        enrollmentDate?: string;
        status?: string;
        documents?: any;
    };
}, res: Response) => Promise<void>;
export declare const loginAsUser: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map