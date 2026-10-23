'use client';

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { ChatDashboard } from '@/components/chat/ChatDashboard';

export default function HomePage() {
  const { isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.replace('/login');
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <main className="flex h-full w-full items-center justify-center p-6 bg-zinc-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </main>
    );
  }

  if (isAuthenticated) {
    return <ChatDashboard />;
  }

  return null;
}
