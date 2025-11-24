import api from './axios';

export interface BatchProgress {
  id: number;
  title: string;
  software?: string;
  mode: string;
  startDate: string;
  endDate: string;
  status?: string;
  totalSessions: number;
  completedSessions: number;
  progressPercentage: number;
  studentCount: number;
  facultyCount: number;
  faculty: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}

export interface BatchProgressResponse {
  status: string;
  data: {
    batches: BatchProgress[];
    totalCount: number;
  };
}

export interface BatchProgressQueryParams {
  search?: string;
  format?: 'json' | 'csv' | 'pdf';
}

export const batchProgressAPI = {
  getBatchProgress: async (params?: BatchProgressQueryParams): Promise<BatchProgressResponse> => {
    // Only include params that have values
    const queryParams: Record<string, string> = {};
    if (params?.search && params.search.trim()) {
      queryParams.search = params.search.trim();
    }
    if (params?.format) {
      queryParams.format = params.format;
    }
    
    const response = await api.get<BatchProgressResponse>('/batches/progress', { 
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined 
    });
    return response.data;
  },

  exportToCSV: async (search?: string): Promise<Blob> => {
    const params: Record<string, string> = { format: 'csv' };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await api.get('/batches/progress', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportToPDF: async (search?: string): Promise<Blob> => {
    const params: Record<string, string> = { format: 'pdf' };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await api.get('/batches/progress', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

