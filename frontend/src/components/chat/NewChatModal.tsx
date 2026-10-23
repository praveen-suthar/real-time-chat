'use client';

import React, { useEffect, useState } from 'react';
import { userService } from '@/services/user.service';
import { chatService } from '@/services/chat.service';
import type { User } from '@/types/auth.types';
import type { ConversationItem } from '@/types/chat.types';
import { X, Search, User as UserIcon } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conv: ConversationItem) => void;
}

export function NewChatModal({
  isOpen,
  onClose,
  onSelectConversation,
}: NewChatModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      userService
        .getUsers()
        .then(({ users }) => setUsers(users))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartChat = async (targetUserId: string) => {
    try {
      setCreating(true);
      const { conversation } = await chatService.createOrGetConversation(targetUserId);
      onSelectConversation(conversation);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm max-h-[85dvh] flex flex-col rounded-lg border border-zinc-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900">
            Start New Conversation
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 border-b border-zinc-100 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-8 py-2 sm:py-1.5 text-sm sm:text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-center text-xs text-zinc-400">Loading users...</p>
          ) : error ? (
            <p className="p-4 text-center text-xs text-red-500">{error}</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-400">
              No users found
            </p>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                disabled={creating}
                onClick={() => handleStartChat(user.id)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-zinc-900 capitalize">
                    {user.username}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {user.email || 'Click to message'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
