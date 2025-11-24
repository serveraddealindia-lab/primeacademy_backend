import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Module } from '../models/RolePermission';
interface CreateRoleBody {
    name: string;
    description?: string;
    permissions?: Array<{
        module: Module;
        canView: boolean;
        canAdd: boolean;
        canEdit: boolean;
        canDelete: boolean;
    }>;
}
interface UpdateRoleBody {
    name?: string;
    description?: string;
    isActive?: boolean;
    permissions?: Array<{
        module: Module;
        canView: boolean;
        canAdd: boolean;
        canEdit: boolean;
        canDelete: boolean;
    }>;
}
interface AssignRoleBody {
    roleId: number;
}
export declare const createRole: (req: AuthRequest & {
    body: CreateRoleBody;
}, res: Response) => Promise<void>;
export declare const getRoles: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getRole: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
export declare const updateRole: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: UpdateRoleBody;
}, res: Response) => Promise<void>;
export declare const deleteRole: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
export declare const assignRoleToUser: (req: AuthRequest & {
    params: {
        id: string;
    };
    body: AssignRoleBody;
}, res: Response) => Promise<void>;
export declare const unassignRoleFromUser: (req: AuthRequest & {
    params: {
        id: string;
        roleId: string;
    };
}, res: Response) => Promise<void>;
export declare const getUserRoles: (req: AuthRequest & {
    params: {
        id: string;
    };
}, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=role.controller.d.ts.map