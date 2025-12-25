import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface CompleteEnrollmentBody {
    studentName: string;
    email: string;
    phone: string;
    whatsappNumber?: string;
    dateOfAdmission: string;
    localAddress?: string;
    permanentAddress?: string;
    emergencyContactNumber?: string;
    emergencyName?: string;
    emergencyRelation?: string;
    courseName?: string;
    batchId?: number;
    softwaresIncluded?: string;
    totalDeal?: number;
    bookingAmount?: number;
    balanceAmount?: number;
    emiPlan?: boolean;
    emiPlanDate?: string;
    emiInstallments?: Array<{
        month: number;
        amount: number;
        dueDate?: string;
    }>;
    complimentarySoftware?: string;
    complimentaryGift?: string;
    hasReference?: boolean;
    referenceDetails?: string;
    counselorName?: string;
    leadSource?: string;
    walkinDate?: string;
    masterFaculty?: string;
    enrollmentDocuments?: string[];
}
export declare const completeEnrollment: (req: AuthRequest & {
    body: CompleteEnrollmentBody;
}, res: Response) => Promise<void>;
export declare const createDummyStudent: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const createThreeDummyStudents: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllSoftware: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCourseNames: (req: AuthRequest, res: Response) => Promise<void>;
export declare const unifiedStudentImport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const bulkEnrollStudents: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStudentAttendance: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadUnifiedTemplate: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=student.controller.d.ts.map