'use client';

import React, { useEffect, useRef } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: LogoutConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={loading ? undefined : onClose}
        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs transition-opacity duration-150"
      />

      <div className="relative w-full max-w-sm rounded-md border border-zinc-200 bg-white p-6 shadow-md transition-all">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="pr-4">
            <h2
              id="logout-dialog-title"
              className="text-base font-semibold tracking-tight text-zinc-900"
            >
              Log out of ChatApp?
            </h2>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to end your current session? You will be redirected to the sign-in page.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Logging out...</span>
              </>
            ) : (
              <span>Log Out</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
