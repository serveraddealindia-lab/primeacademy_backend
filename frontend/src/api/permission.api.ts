import api from './axios';

export enum Module {
  BATCHES = 'batches',
  STUDENTS = 'students',
  FACULTY = 'faculty',
  EMPLOYEES = 'employees',
  SESSIONS = 'sessions',
  ATTENDANCE = 'attendance',
  PAYMENTS = 'payments',
  PORTFOLIOS = 'portfolios',
  REPORTS = 'reports',
  APPROVALS = 'approvals',
  USERS = 'users',
  SOFTWARE_COMPLETIONS = 'software_completions',
  STUDENT_LEAVES = 'student_leaves',
  BATCH_EXTENSIONS = 'batch_extensions',
  EMPLOYEE_LEAVES = 'employee_leaves',
  FACULTY_LEAVES = 'faculty_leaves',
}

export interface Permission {
  id: number;
  userId: number;
  module: Module;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdatePermissionRequest {
  module: Module;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UpdatePermissionsRequest {
  permissions: UpdatePermissionRequest[];
}

export interface PermissionsResponse {
  status: string;
  data: {
    permissions: Permission[];
  };
}

export interface ModulesResponse {
  status: string;
  data: {
    modules: Array<{
      value: string;
      label: string;
    }>;
  };
}

export const permissionAPI = {
  getUserPermissions: async (userId: number): Promise<PermissionsResponse> => {
    const response = await api.get<PermissionsResponse>(`/users/${userId}/permissions`);
    return response.data;
  },
  updateUserPermissions: async (userId: number, data: UpdatePermissionsRequest): Promise<PermissionsResponse> => {
    const response = await api.put<PermissionsResponse>(`/users/${userId}/permissions`, data);
    return response.data;
  },
  getModules: async (): Promise<ModulesResponse> => {
    const response = await api.get<ModulesResponse>('/users/modules/list');
    return response.data;
  },
};

