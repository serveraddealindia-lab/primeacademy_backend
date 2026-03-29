import api from './axios';

export type TaskStatus = 'pending' | 'approved' | 'completed';
export type TaskAttendanceStatus = 'A' | 'P' | 'LATE' | 'ONLINE';

export interface TaskStudentLink {
  id: number;
  studentId: number;
  attendanceStatus: TaskAttendanceStatus | null;
  student?: { id: number; name: string; email: string };
}

export interface Task {
  id: number;
  facultyId: number;
  subject: string;
  date: string;
  time: string;
  status: TaskStatus;
  approvedBy?: number | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  taskStudents?: TaskStudentLink[];
}

export const taskAPI = {
  create: async (payload: { subject: string; date: string; time: string; studentIds: number[] }) => {
    const response = await api.post<{ status: string; data: { taskId: number } }>('/tasks/create', payload);
    return response.data.data;
  },
  approve: async (payload: { taskId: number; approve: boolean }) => {
    const response = await api.post<{ status: string; message: string }>('/tasks/approve', payload);
    return response.data;
  },
  facultyDashboard: async (params?: { from?: string; to?: string }): Promise<Task[]> => {
    const response = await api.get<{ status: string; data: Task[] }>('/tasks/faculty-dashboard', { params });
    return response.data.data;
  },
  submitAttendance: async (payload: { taskId: number; attendance: Array<{ studentId: number; status: TaskAttendanceStatus | null }> }) => {
    const response = await api.post<{ status: string; message: string }>('/tasks/attendance', payload);
    return response.data;
  },
};

