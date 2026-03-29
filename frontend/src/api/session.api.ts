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

export type BatchSchedule = Record<string, { startTime: string; endTime: string }>;

export interface FacultyBatch {
  batch: {
    id: number;
    title: string;
    startDate?: string;
    endDate?: string;
    schedule?: BatchSchedule;
    status?: string;
    mode?: string;
    studentCount?: number;
    courseId?: number | null;
    courseLectureTopics?: string[];
    // Batch software list is used as "subjects" for faculty lectures/tasks
    software?: unknown;
  };
  activeSession: SessionSummary | null;
}

export interface SessionSummary {
  id: number;
  batchId: number;
  facultyId: number | null;
  date: string;
  topic?: string | null;
  status: 'scheduled' | 'ongoing' | 'completed';
  startTime?: string | null;
  endTime?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  attendanceSubmittedAt?: string | null;
  delayReason?: string | null;
}

export type AttendanceOption = 'present' | 'absent' | 'late' | 'online';

export interface StudentAttendanceEntry {
  studentId: number;
  name: string;
  email: string;
  status: AttendanceOption;
  present?: boolean;
}

export interface AttendanceDraftPayload {
  version: 1;
  sessionId: number;
  batchId: number;
  updatedAt: string; // ISO
  attendance: Record<number, AttendanceOption | null>;
}

export interface SessionAttendancePayload {
  attendance: Array<{ studentId: number; status?: AttendanceOption; present?: boolean }>;
}

export const sessionAPI = {
  getDashboardBatches: async (): Promise<FacultyBatch[]> => {
    try {
      const response = await api.get<{ status: string; data: FacultyBatch[] }>('/sessions/dashboard-batches');
      return response.data.data;
    } catch (e: any) {
      // Backend route may not exist in some running environments; fallback to faculty endpoint.
      const status = e?.response?.status;
      if (status === 404) {
        const fallback = await sessionAPI.getFacultyBatches();
        return fallback;
      }
      throw e;
    }
  },
  getFacultyBatches: async (): Promise<FacultyBatch[]> => {
    const response = await api.get<{ status: string; data: FacultyBatch[] }>('/sessions/faculty/assigned');
    return response.data.data;
  },
  startSession: async (batchId: number, payload?: { topic?: string }) => {
    const response = await api.post<{ status: string; data: SessionSummary }>(`/sessions/${batchId}/start`, payload);
    return response.data.data;
  },
  endSession: async (sessionId: number) => {
    const response = await api.post<{ status: string; data: SessionSummary }>(`/sessions/${sessionId}/end`);
    return response.data.data;
  },
  submitAttendance: async (sessionId: number, payload: SessionAttendancePayload) => {
    const response = await api.post<{ status: string; data: Array<{ studentId: number; status: AttendanceOption }> }>(
      `/sessions/${sessionId}/attendance`,
      payload
    );
    return response.data.data;
  },
  getBatchStudents: async (batchId: number): Promise<StudentAttendanceEntry[]> => {
    // Use batch details endpoint because it reliably returns enrollments + student info.
    // Some DB/enrollment join configurations can make `/batches/:id/enrollments` return empty for faculty UI.
    const response = await api.get<{
      status: string;
      data: {
        batch: {
          enrollments?: Array<{ id: number; name: string; email: string }>;
        };
      };
    }>(`/batches/${batchId}`);

    const enrollments = response.data.data.batch.enrollments || [];

    return enrollments.map((enrollment) => ({
      studentId: enrollment.id,
      name: enrollment.name,
      email: enrollment.email,
      status: 'present',
      present: true,
    }));
  },
  getBatchHistory: async (batchId: number): Promise<any[]> => {
    const response = await api.get<{ status: string; data: any[] }>(`/sessions/batch/${batchId}/history`);
    return response.data.data;
  },
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
  saveAttendanceDraft: async (sessionId: number, draft: AttendanceDraftPayload) => {
    const response = await api.patch<{ status: string; data: any }>('/attendance/save-draft', {
      sessionId,
      payload: draft,
    });
    return response.data.data;
  },
  getAttendanceDraft: async (sessionId: number): Promise<AttendanceDraftPayload | null> => {
    const response = await api.get<{ status: string; data: { sessionId: number; payload: AttendanceDraftPayload } | null }>(
      '/attendance/draft',
      { params: { sessionId } }
    );
    return response.data.data ? response.data.data.payload : null;
  },
  saveDelayReason: async (sessionId: number, delay_reason: string) => {
    const response = await api.patch<{ status: string; data: any }>('/lectures/add-delay-reason', {
      sessionId,
      delay_reason,
    });
    return response.data.data;
  },
  updateSessionTopic: async (sessionId: number, topic: string) => {
    const response = await api.patch<{ status: string; data: { sessionId: number; topic: string } }>(`/sessions/${sessionId}/topic`, {
      topic,
    });
    return response.data.data;
  },
};





