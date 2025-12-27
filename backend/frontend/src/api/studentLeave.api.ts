import api from './axios';

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface StudentLeave {
  id: number;
  studentId: number;
  batchId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  batch?: {
    id: number;
    title: string;
    software?: string;
  };
  approver?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateLeaveRequest {
  studentId: number;
  batchId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ApproveLeaveRequest {
  approve: boolean;
  rejectionReason?: string;
}

export interface LeavesResponse {
  status: string;
  data: {
    leaves: StudentLeave[];
    count: number;
  };
}

export interface LeaveResponse {
  status: string;
  message: string;
  data: {
    leave: StudentLeave;
  };
}

export interface LeavesQueryParams {
  studentId?: number;
  batchId?: number;
  status?: LeaveStatus;
}

export const studentLeaveAPI = {
  createLeave: async (data: CreateLeaveRequest): Promise<LeaveResponse> => {
    const response = await api.post<LeaveResponse>('/student-leaves', data);
    return response.data;
  },

  getLeaves: async (params?: LeavesQueryParams): Promise<LeavesResponse> => {
    const response = await api.get<LeavesResponse>('/student-leaves', { params });
    return response.data;
  },

  approveLeave: async (id: number, data: ApproveLeaveRequest): Promise<LeaveResponse> => {
    const response = await api.post<LeaveResponse>(`/student-leaves/${id}/approve`, data);
    return response.data;
  },
};






