import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
interface AcknowledgeOrientationBody {
    studentId: number;
    studentName: string;
    course: string;
    specialCommitment?: string;
    specialBatchTiming?: string;
    unableToPracticeReason?: string;
    paymentExemption?: string;
    confirmed: boolean;
}
export declare const acknowledgeOrientation: (req: {
    body: AcknowledgeOrientationBody;
} & {
    user?: any;
}, res: Response) => Promise<void>;
export declare const getOrientationStatus: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=orientation.controller.d.ts.map