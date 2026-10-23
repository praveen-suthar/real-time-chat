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
      console.warn('[AuthInitializer] 3s timeout reached -> calling clearAuth');
      dispatch(clearAuth());
    }, 3000);

    console.log('[AuthInitializer] Calling authService.getMe()...');
    authService
      .getMe()
      .then(({ user }) => {
        console.log('[AuthInitializer] getMe success:', user?.username);
        clearTimeout(timer);
        dispatch(setUser(user));
      })
      .catch((err) => {
        console.warn('[AuthInitializer] getMe failed:', err?.message);
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
