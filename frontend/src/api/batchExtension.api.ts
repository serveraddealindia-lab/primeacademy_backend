import api from './axios';

export enum ExtensionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface BatchExtension {
  id: number;
  batchId: number;
  requestedBy: number;
  numberOfSessions: number;
  reason?: string;
  status: ExtensionStatus;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  batch?: {
    id: number;
    title: string;
    software?: string;
    startDate: string;
    endDate: string;
  };
  requester?: {
    id: number;
    name: string;
    email: string;
  };
  approver?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateExtensionRequest {
  batchId: number;
  numberOfSessions: number;
  reason?: string;
}

export interface ApproveExtensionRequest {
  approve: boolean;
  rejectionReason?: string;
}

export interface ExtensionsResponse {
  status: string;
  data: {
    extensions: BatchExtension[];
    count: number;
  };
}

export interface ExtensionResponse {
  status: string;
  message: string;
  data: {
    extension: BatchExtension;
  };
}

export interface ExtensionsQueryParams {
  batchId?: number;
  status?: ExtensionStatus;
}

export const batchExtensionAPI = {
  createExtension: async (data: CreateExtensionRequest): Promise<ExtensionResponse> => {
    const response = await api.post<ExtensionResponse>('/batch-extensions', data);
    return response.data;
  },

  getExtensions: async (params?: ExtensionsQueryParams): Promise<ExtensionsResponse> => {
    const response = await api.get<ExtensionsResponse>('/batch-extensions', { params });
    return response.data;
  },

  approveExtension: async (id: number, data: ApproveExtensionRequest): Promise<ExtensionResponse> => {
    const response = await api.post<ExtensionResponse>(`/batch-extensions/${id}/approve`, data);
    return response.data;
  },
};






