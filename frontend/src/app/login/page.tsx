'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setUser } from '@/store/authSlice';
import { authService } from '@/services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { user } = await authService.login({
        username: username.trim(),
        password,
      });

      dispatch(setUser(user));
      router.replace('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (uname: string) => {
    setUsername(uname);
    setPassword('password123');
  };

  if (isAuthenticated) {
    return (
      <main className="flex h-full w-full items-center justify-center p-6 bg-zinc-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex h-full w-full overflow-y-auto items-center justify-center p-4 bg-zinc-50">
      <div className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Sign In
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back to ChatApp.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-zinc-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="e.g. praveen"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-xs text-zinc-500">Quick test login:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['praveen', 'priya', 'rohit', 'sneha'].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleQuickLogin(name)}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-zinc-900 underline hover:text-zinc-700"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
