import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (error) => {
    // Enhanced error logging for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        status: error.response?.status,
        message: error.message,
        response: error.response?.data,
        request: error.request,
      });
    }

    // Handle network errors (no response from server)
    if (!error.response && error.request) {
      const baseURL = error.config?.baseURL || 'http://localhost:3000/api';
      console.error(`Cannot connect to server at ${baseURL}. Make sure the backend is running.`);
    }

    // Don't redirect on login endpoint 401 errors
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

