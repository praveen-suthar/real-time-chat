'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { setUser, clearAuth } from '@/store/authSlice';
import { authApi } from '@/lib/apiClient';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    authApi
      .getMe()
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
