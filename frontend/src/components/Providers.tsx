'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { setUser, clearAuth } from '@/store/authSlice';
import { authService } from '@/services/auth.service';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    authService
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
