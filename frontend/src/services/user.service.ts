import { apiClient } from '@/lib/apiClient';
import type { User } from '@/types/auth.types';

export const userService = {
  getUsers: async (): Promise<{ users: User[] }> => {
    const res = await apiClient.get<{ users: User[] }>('/api/users');
    return res.data;
  },
};
