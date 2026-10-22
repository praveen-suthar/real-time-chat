'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { setCredentials, setAuthLoading, logout } from '@/store/authSlice';
import { apiRequest } from '@/lib/api';
import type { User } from '@/store/authSlice';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token) {
      store.dispatch(setAuthLoading(false));
      return;
    }

    apiRequest<{ user: User }>('/api/auth/me')
      .then(({ user }) => {
        store.dispatch(setCredentials({ user, token }));
      })
      .catch(() => {
        store.dispatch(logout());
      });
  }, []);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
