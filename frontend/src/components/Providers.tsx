'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { setUser, clearAuth } from '@/store/authSlice';
import { apiRequest } from '@/lib/api';
import type { User } from '@/store/authSlice';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    apiRequest<{ user: User }>('/api/auth/me')
      .then(({ user }) => {
        store.dispatch(setUser(user));
      })
      .catch(() => {
        store.dispatch(clearAuth());
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
