import { apiClient } from '@/lib/apiClient';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types/auth.types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
    if (res.data.token && typeof window !== 'undefined') {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/register', data);
    if (res.data.token && typeof window !== 'undefined') {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  },

  logout: async (): Promise<{ message: string }> => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    const res = await apiClient.post<{ message: string }>('/api/auth/logout');
    return res.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const res = await apiClient.get<{ user: User }>('/api/auth/me');
    return res.data;
  },
};
