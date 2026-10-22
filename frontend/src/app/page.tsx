'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { clearAuth } from '@/store/authSlice';
import { apiRequest } from '@/lib/api';
import { LogOut, MessageSquare, User as UserIcon } from 'lucide-react';

export default function HomePage() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  );

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      dispatch(clearAuth());
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
                ChatApp
              </h1>
              <p className="text-xs text-zinc-500">Real-time Chat Platform</p>
            </div>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>

        {isAuthenticated && user ? (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="h-10 w-10 rounded-full border border-zinc-200 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                  <UserIcon className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-zinc-900 capitalize">
                  {user.username}
                </p>
                <p className="text-xs text-zinc-500">
                  {user.email || 'Online'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-md bg-zinc-50 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-zinc-700">
                  Secure httpOnly session active
                </span>
              </div>
              <span className="text-xs text-zinc-400">Ready for chat</span>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3 border-t border-zinc-100 pt-4">
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
        )}
      </div>
    </main>
  );
}
