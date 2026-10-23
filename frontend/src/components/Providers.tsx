'use client';

import React, { useEffect, useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from '@/store/store';
import { setUser, clearAuth } from '@/store/authSlice';
import { authService } from '@/services/auth.service';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Safety timeout in case backend is slow to respond (e.g., serverless cold start)
    const timer = setTimeout(() => {
      dispatch(clearAuth());
    }, 6000);

    authService
      .getMe()
      .then(({ user }) => {
        clearTimeout(timer);
        dispatch(setUser(user));
      })
      .catch(() => {
        clearTimeout(timer);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        dispatch(clearAuth());
      });

    return () => clearTimeout(timer);
  }, [dispatch]);

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
