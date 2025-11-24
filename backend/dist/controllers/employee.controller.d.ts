import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CreateEmployeeProfileBody {
    userId: number;
    employeeId: string;
    gender?: 'Male' | 'Female' | 'Other';
    dateOfBirth?: string;
    nationality?: string;
    maritalStatus?: 'Single' | 'Married' | 'Other';
    department?: string;
    designation?: string;
    dateOfJoining?: string;
    employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern';
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
}
interface GetEmployeeProfileParams {
    id: string;
}
export declare const createEmployeeProfile: (req: AuthRequest & {
    body: CreateEmployeeProfileBody;
}, res: Response) => Promise<void>;
export declare const getEmployeeProfile: (req: AuthRequest & {
    params: GetEmployeeProfileParams;
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=employee.controller.d.ts.map