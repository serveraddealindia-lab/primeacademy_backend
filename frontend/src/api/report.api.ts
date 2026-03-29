import api from './axios';

export interface StudentsWithoutBatchReport {
  students: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
    enrollments: any[];
  }>;
  totalCount: number;
}

export interface BatchAttendanceReport {
  batch: {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
  };
  dateRange?: {
    from: string;
    to: string;
  };
  sessions: Array<{
    session: {
      id: number;
      date: string;
      startTime: string;
      endTime: string;
      topic?: string;
      status: string;
    };
    attendances: Array<{
      id: number;
      studentId: number;
      studentName: string;
      studentEmail: string;
      status: string;
      isManual: boolean;
      markedBy?: {
        id: number;
        name: string;
      };
      markedAt: string;
    }>;
  }>;
  studentStatistics: Array<{
    studentId: number;
    present: number;
    absent: number;
    manualPresent: number;
    total: number;
    attendanceRate: string;
  }>;
  totalSessions: number;
  totalAttendances: number;
}

export interface PendingPaymentsReport {
  payments: Array<{
    id: number;
    student: {
      id: number;
      name: string;
      email: string;
      phone?: string;
    };
    amount: number;
    dueDate: string;
    status: string;
    isOverdue: boolean;
    createdAt: string;
  }>;
  summary: {
    totalPending: number;
    totalPendingAmount: string;
    overdue: {
      count: number;
      amount: string;
    };
    upcoming: {
      count: number;
      amount: string;
    };
  };
}

export interface PortfolioStatusReport {
  portfolios: Array<{
    id: number;
    student: {
      id: number;
      name: string;
      email: string;
    };
    batch: {
      id: number;
      title: string;
      status: string;
    };
    status: string;
    files: Record<string, string>;
    approvedBy?: number;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  byStatus: {
    pending: Array<{
      id: number;
      studentName: string;
      batchTitle: string;
      createdAt: string;
    }>;
    approved: Array<{
      id: number;
      studentName: string;
      batchTitle: string;
      approvedAt: string;
    }>;
    rejected: Array<{
      id: number;
      studentName: string;
      batchTitle: string;
      updatedAt: string;
    }>;
  };
}

export interface AllAnalysisReport {
  summary: {
    students: {
      total: number;
      withBatch: number;
      withoutBatch: number;
    };
    batches: {
      total: number;
      active: number;
      ended: number;
    };
    sessions: {
      total: number;
    };
    payments: {
      total: number;
      pending: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
    };
    portfolios: {
      total: number;
      pending: number;
    };
  };
  generatedAt: string;
}

export interface StudentsEnrolledBatchNotStarted {
  students: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    enrollmentId: number;
    enrollmentDate: string;
    batch: {
      id: number;
      title: string;
      software?: string | null;
      mode: string;
      startDate: string;
      endDate: string;
      status?: string | null;
      schedule?: Record<string, unknown> | null;
    };
  }>;
  totalCount: number;
}

export interface StudentsMultipleCoursesConflict {
  students: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    batches: Array<{
      id: number;
      title: string;
      software?: string | null;
      mode: string;
      startDate: string;
      endDate: string;
      status?: string | null;
      schedule?: Record<string, unknown> | null;
      enrollmentId: number;
      enrollmentDate: string;
    }>;
    runningBatches: number;
    futureBatches: number;
    hasTimeConflict: boolean;
    totalEnrollments: number;
  }>;
  totalCount: number;
}

export interface StudentsOnLeavePendingBatches {
  students: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    leaves: Array<{
      id: number;
      batchId: number;
      batchTitle: string;
      startDate: string;
      endDate: string;
      reason?: string | null;
      status: string;
    }>;
    pendingBatches: Array<{
      id: number;
      title: string;
      software?: string | null;
      mode: string;
      startDate: string;
      endDate: string;
      status?: string | null;
      schedule?: Record<string, unknown> | null;
      enrollmentId: number;
      enrollmentDate: string;
      isRunning: boolean;
    }>;
    totalLeaves: number;
    totalPendingBatches: number;
  }>;
  totalCount: number;
}

export interface StudentsWiseReport {
  students: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    createdAt: string;
    softwareList?: string[];
    profileStatus?: string | null;
    batches?: Array<{
      id: number;
      title: string;
      software?: string | null;
      mode: string;
      startDate: string;
      endDate: string;
      status?: string | null;
    }>;
    enrollmentDate?: string | null;
    payments?: Array<{
      id: number;
      amount: number;
      status: string;
      dueDate: string;
      paidDate?: string | null;
    }>;
  }>;
  totalCount: number;
  filterType?: string;
}

export interface FacultyOccupancyRow {
  facultyId: number;
  facultyName: string;
  workingHours: number;
  occupiedHours: number;
  freeHours: number;
  occupancyPercent: number;
}

export interface FacultyOccupancyReport {
  filters: { from?: string; to?: string; facultyId?: number };
  rows: FacultyOccupancyRow[];
  summary: {
    workingHours: number;
    occupiedHours: number;
    freeHours: number;
    occupancyPercent: number;
  };
}

export interface BatchDetailsRow {
  batchId: number;
  batchName: string;
  numberOfStudents: number;
  schedule: {
    days?: string;
    time?: string;
    [key: string]: any;
  };
  assignedFaculty: Array<{
    id: number;
    name: string;
    email?: string;
  }>;
}

export interface SavedReport {
  id: number;
  reportType: string;
  reportName: string;
  generatedBy: number;
  parameters?: Record<string, any>;
  data: Record<string, any>;
  summary?: Record<string, any>;
  recordCount?: number;
  fileUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  generator?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface SavedReportsResponse {
  reports: SavedReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BatchDetailsReport {
  filters: { type?: 'present' | 'future'; facultyId?: number; days?: string };
  rows: BatchDetailsRow[];
}

export const reportAPI = {
  getStudentsWithoutBatch: async (): Promise<{ status: string; data: StudentsWithoutBatchReport }> => {
    const response = await api.get('/attendance-reports/students-without-batch');
    return response.data;
  },
  getBatchAttendance: async (batchId: number, params?: { from?: string; to?: string }): Promise<{ status: string; data: BatchAttendanceReport }> => {
    const response = await api.get(`/reports/batch-attendance`, { params: { batchId, ...params } });
    return response.data;
  },
  getPendingPayments: async (): Promise<{ status: string; data: PendingPaymentsReport }> => {
    const response = await api.get('/reports/pending-payments');
    return response.data;
  },
  getPortfolioStatus: async (): Promise<{ status: string; data: PortfolioStatusReport }> => {
    const response = await api.get('/reports/portfolio-status');
    return response.data;
  },
  getAllAnalysisReports: async (): Promise<{ status: string; data: AllAnalysisReport }> => {
    const response = await api.get('/reports/all-analysis');
    return response.data;
  },
  getFacultyOccupancy: async (params?: { from?: string; to?: string; facultyId?: number }): Promise<{ status: string; data: FacultyOccupancyReport }> => {
    const response = await api.get('/reports/faculty-occupancy', { params });
    return response.data;
  },
  getBatchDetails: async (params?: { type?: 'present' | 'future'; facultyId?: number; days?: string }): Promise<{ status: string; data: BatchDetailsReport }> => {
    const response = await api.get('/reports/batch-details', { params });
    return response.data;
  },
  getStudentsEnrolledBatchNotStarted: async (): Promise<{ status: string; data: StudentsEnrolledBatchNotStarted }> => {
    const response = await api.get('/attendance-reports/students-enrolled-batch-not-started');
    return response.data;
  },
  getStudentsMultipleCoursesConflict: async (): Promise<{ status: string; data: StudentsMultipleCoursesConflict }> => {
    const response = await api.get('/attendance-reports/students-multiple-courses-conflict');
    return response.data;
  },
  getStudentsOnLeavePendingBatches: async (): Promise<{ status: string; data: StudentsOnLeavePendingBatches }> => {
    const response = await api.get('/attendance-reports/students-on-leave-pending-batches');
    return response.data;
  },
  getStudentsWise: async (params?: {
    filterType?: 'studentwise' | 'batchwise' | 'coursewise' | 'softwarewise' | 'paymentwise';
    batchId?: number;
    courseId?: number;
    software?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ status: string; data: StudentsWiseReport }> => {
    const response = await api.get('/attendance-reports/students-wise', { params });
    return response.data;
  },
  // Saved Reports API
  getSavedReports: async (params?: {
    reportType?: string;
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<{ status: string; data: SavedReportsResponse }> => {
    const response = await api.get('/reports/saved', { params });
    return response.data;
  },
  getSavedReportDetails: async (id: number): Promise<{ status: string; data: SavedReport }> => {
    const response = await api.get(`/reports/saved/${id}`);
    return response.data;
  },
  downloadReportCSV: async (id: number): Promise<Blob> => {
    const response = await api.get(`/reports/saved/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

