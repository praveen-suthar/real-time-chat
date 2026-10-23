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

    const timer = setTimeout(() => {
      dispatch(clearAuth());
    }, 3000);

    authService
      .getMe()
      .then(({ user }) => {
        clearTimeout(timer);
        dispatch(setUser(user));
      })
      .catch(() => {
        clearTimeout(timer);
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
