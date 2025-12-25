import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getEmployeeProfile: (req: AuthRequest & {
    params: {
        userId: string;
    };
}, res: Response) => Promise<void>;
export declare const createEmployeeProfile: (req: AuthRequest & {
    body: {
        userId: number;
        employeeId: string;
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
        address?: string;
        emergencyContactName?: string;
        emergencyRelationship?: string;
        emergencyPhoneNumber?: string;
        emergencyAlternatePhone?: string;
    };
}, res: Response) => Promise<void>;
//# sourceMappingURL=employee.controller.d.ts.map