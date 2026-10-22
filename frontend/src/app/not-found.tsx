'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-24 text-center sm:py-32">
      <p className="text-2xl font-semibold tracking-widest text-zinc-400 uppercase">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
        Oops! Page not found.
      </h1>
      <p className="mt-4 text-sm text-zinc-500 max-w-sm">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </main>
  );
}
