import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types/auth.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      console.log('[Redux Auth] setUser:', action.payload?.username);
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      console.log('[Redux Auth] setAuthLoading:', action.payload);
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      console.log('[Redux Auth] setAuthError:', action.payload);
      state.error = action.payload;
      state.loading = false;
    },
    clearAuth: (state) => {
      console.log('[Redux Auth] clearAuth called');
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setUser, setAuthLoading, setAuthError, clearAuth } =
  authSlice.actions;

export default authSlice.reducer;
