import api from './axios';

export enum SoftwareCompletionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface SoftwareCompletion {
  id: number;
  studentId: number;
  batchId: number;
  softwareName: string;
  startDate: string;
  endDate: string;
  facultyId: number;
  status: SoftwareCompletionStatus;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    id: number;
    name: string;
    email: string;
  };
  batch?: {
    id: number;
    title: string;
    software?: string;
  };
  faculty?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateCompletionRequest {
  studentId: number;
  batchId: number;
  softwareName: string;
  startDate: string;
  endDate: string;
  facultyId: number;
}

export interface UpdateCompletionRequest {
  status?: 'in_progress' | 'completed';
  endDate?: string;
}

export interface CompletionsResponse {
  status: string;
  data: {
    completions: SoftwareCompletion[];
    count: number;
  };
}

export interface CompletionResponse {
  status: string;
  message: string;
  data: {
    completion: SoftwareCompletion;
  };
}

export interface CompletionsQueryParams {
  studentId?: number;
  batchId?: number;
  facultyId?: number;
  status?: SoftwareCompletionStatus;
}

export const softwareCompletionAPI = {
  createCompletion: async (data: CreateCompletionRequest): Promise<CompletionResponse> => {
    const response = await api.post<CompletionResponse>('/software-completions', data);
    return response.data;
  },

  getCompletions: async (params?: CompletionsQueryParams): Promise<CompletionsResponse> => {
    const response = await api.get<CompletionsResponse>('/software-completions', { params });
    return response.data;
  },

  updateCompletion: async (id: number, data: UpdateCompletionRequest): Promise<CompletionResponse> => {
    const response = await api.patch<CompletionResponse>(`/software-completions/${id}`, data);
    return response.data;
  },
};






