'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { ChatDashboard } from '@/components/chat/ChatDashboard';
import { MessageSquare } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-zinc-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </main>
    );
  }

  if (isAuthenticated) {
    return <ChatDashboard />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-white">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-900">
              ChatApp
            </h1>
            <p className="text-xs text-zinc-500">Real-time Chat Platform</p>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4">
          <p className="text-xs text-zinc-600">
            Please sign in to access your conversations and send real-time messages.
          </p>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 rounded-md bg-zinc-900 py-2 text-center text-xs font-medium text-white hover:bg-zinc-800"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-md border border-zinc-200 bg-white py-2 text-center text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
