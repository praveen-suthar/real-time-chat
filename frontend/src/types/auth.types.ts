export interface User {
  id: string;
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}
