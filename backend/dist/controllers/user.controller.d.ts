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
export declare const updateFacultyProfile: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: {
        expertise?: string;
        availability?: string;
    };
}, res: Response) => Promise<void>;
export declare const updateEmployeeProfile: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: {
        employeeId?: string;
        gender?: string;
        dateOfBirth?: string;
        nationality?: string;
        maritalStatus?: string;
        department?: string;
        designation?: string;
        dateOfJoining?: string;
        employmentType?: string;
        reportingManager?: string;
        workLocation?: string;
        bankName?: string;
        accountNumber?: string;
        ifscCode?: string;
        branch?: string;
        panNumber?: string;
        city?: string;
        state?: string;
        postalCode?: string;
    };
}, res: Response) => Promise<void>;
export declare const loginAsUser: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map