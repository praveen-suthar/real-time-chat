import axios, { AxiosError } from 'axios';
import type { User } from '@/store/authSlice';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Automatically sends and receives httpOnly session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// Typed API modules
export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<{ user: User }> => {
    const res = await apiClient.post<{ user: User }>('/api/auth/login', credentials);
    return res.data;
  },

  register: async (data: {
    username: string;
    email?: string;
    password: string;
  }): Promise<{ user: User }> => {
    const res = await apiClient.post<{ user: User }>('/api/auth/register', data);
    return res.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/auth/logout');
    return res.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const res = await apiClient.get<{ user: User }>('/api/auth/me');
    return res.data;
  },
};

export const userApi = {
  getUsers: async (): Promise<{ users: User[] }> => {
    const res = await apiClient.get<{ users: User[] }>('/api/users');
    return res.data;
  },
};

// Generic helper for ad-hoc requests
export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: unknown;
    params?: unknown;
  } = {}
): Promise<T> {
  const response = await apiClient.request<T>({
    url: endpoint,
    method: options.method || 'GET',
    data: options.data,
    params: options.params,
  });
  return response.data;
}
