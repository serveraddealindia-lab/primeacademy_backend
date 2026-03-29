import axios from 'axios';

// Get base URL from environment variable (used by axios and by raw fetch() calls).
// In production set VITE_API_BASE_URL to your API origin (e.g. https://api.example.com); /api is appended.
// In development defaults to http://localhost:3001/api.
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const base = envUrl.trim();
    return base.endsWith('/api') ? base : `${base.replace(/\/+$/, '')}/api`;
  }
  return 'http://localhost:3001/api';
};

/** Origin for static assets (uploads, receipts) – no /api path. */
export const getApiOrigin = (): string => {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/?$/, '') || 'http://localhost:3001';
};

const getBaseURL = getApiBaseUrl;

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const enqueueRefresh = (cb: (token: string | null) => void) => {
  refreshQueue.push(cb);
};
const resolveRefreshQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData (file uploads)
    // Let the browser set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Enhanced error logging for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      response: error.response?.data,
      request: error.request,
    });
    
    // Log full error object in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error object:', error);
    }

    // Handle network errors (no response from server)
    if (!error.response && error.request) {
      const baseURL = error.config?.baseURL || 'http://localhost:3001/api';
      console.error(`Cannot connect to server at ${baseURL}. Make sure the backend is running.`);
    }

    // Don't redirect on login endpoint 401 errors
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login') && !error.config?.url?.includes('/auth/refresh')) {
      const originalRequest = error.config;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken && !originalRequest.__isRetryRequest) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            enqueueRefresh((newToken) => {
              if (!newToken) {
                reject(error);
                return;
              }
              originalRequest.__isRetryRequest = true;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            });
          });
        }

        isRefreshing = true;
        try {
          const refreshResponse = await api.post('/auth/refresh', { refreshToken });
          const newToken = refreshResponse.data?.data?.token;
          if (newToken) {
            localStorage.setItem('token', newToken);
            resolveRefreshQueue(newToken);
            originalRequest.__isRetryRequest = true;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
          resolveRefreshQueue(null);
        } catch (refreshError) {
          resolveRefreshQueue(null);
        } finally {
          isRefreshing = false;
        }
      }

      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

