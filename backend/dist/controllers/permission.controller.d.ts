import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Module } from '../models/Permission';
interface UpdatePermissionsBody {
    permissions: Array<{
        module: Module;
        canView: boolean;
        canAdd: boolean;
        canEdit: boolean;
        canDelete: boolean;
    }>;
}
export declare const getUserPermissions: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
export declare const updateUserPermissions: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: UpdatePermissionsBody;
}, res: Response) => Promise<void>;
export declare const getModules: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=permission.controller.d.ts.map