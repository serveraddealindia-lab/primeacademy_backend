import api from './axios';

export interface Session {
  id: number;
  batchId: number;
  facultyId: number;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string;
  isBackup: boolean;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  actualStartAt?: string;
  actualEndAt?: string;
  createdAt?: string;
  updatedAt?: string;
  batch?: {
    id: number;
    title: string;
  };
  faculty?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateSessionRequest {
  batchId: number;
  facultyId: number;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string;
  isBackup?: boolean;
}

export interface SessionsResponse {
  status: string;
  data: {
    sessions: Session[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface SessionResponse {
  status: string;
  data: {
    session: Session;
  };
}

export const sessionAPI = {
  getAllSessions: async (params?: { batchId?: number; facultyId?: number; status?: string }): Promise<SessionsResponse> => {
    const response = await api.get<SessionsResponse>('/sessions', { params });
    return response.data;
  },
  getSession: async (id: number): Promise<SessionResponse> => {
    const response = await api.get<SessionResponse>(`/sessions/${id}`);
    return response.data;
  },
  createSession: async (data: CreateSessionRequest): Promise<SessionResponse> => {
    const response = await api.post<SessionResponse>('/sessions', data);
    return response.data;
  },
  checkInSession: async (id: number): Promise<SessionResponse> => {
    const response = await api.post<SessionResponse>(`/sessions/${id}/checkin`);
    return response.data;
  },
  checkOutSession: async (id: number): Promise<SessionResponse> => {
    const response = await api.post<SessionResponse>(`/sessions/${id}/checkout`);
    return response.data;
  },
};



