'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import type { MessageItem } from '@/types/chat.types';
import { X, Search, Forward, User as UserIcon, Check } from 'lucide-react';

interface ForwardModalProps {
  isOpen: boolean;
  message: MessageItem | null;
  onClose: () => void;
  onForward: (targetConversationId: string) => Promise<void> | void;
}

export function ForwardModal({
  isOpen,
  message,
  onClose,
  onForward,
}: ForwardModalProps) {
  const { conversations, activeConversationId } = useSelector(
    (state: RootState) => state.chat
  );

  const [search, setSearch] = useState('');
  const [forwardingTo, setForwardingTo] = useState<string | null>(null);
  const [forwardedList, setForwardedList] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setForwardedList([]);
      setForwardingTo(null);
      setSearch('');
    }
  }, [isOpen, message?.id]);

  if (!isOpen || !message) return null;

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = async (conversationId: string) => {
    try {
      setForwardingTo(conversationId);
      await onForward(conversationId);
      setForwardedList((prev) => [...prev, conversationId]);
    } finally {
      setForwardingTo(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
    >
      <div className="w-full max-w-sm max-h-[85dvh] flex flex-col rounded-lg border border-zinc-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Forward className="h-4 w-4 text-zinc-700" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Forward Message
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 bg-zinc-50 border-b border-zinc-100 shrink-0">
          <div className="rounded-md border border-zinc-200 bg-white p-2.5 text-xs text-zinc-700 shadow-2xs">
            {message.mediaUrl && (
              <div className="mb-2 max-h-32 overflow-hidden rounded bg-black">
                {message.mediaType === 'video' || message.mediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                  <video
                    src={message.mediaUrl}
                    className="max-h-32 w-full object-cover rounded"
                    muted
                  />
                ) : (
                  <img
                    src={message.mediaUrl}
                    alt="Attachment preview"
                    className="max-h-32 w-full object-cover rounded"
                  />
                )}
              </div>
            )}
            <p className="truncate line-clamp-2 text-zinc-800">
              {message.content || '[Media attachment]'}
            </p>
          </div>
        </div>

        <div className="p-3 border-b border-zinc-100 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search chat to forward to..."
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

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-50 p-1">
          {filteredConversations.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-400">
              No chats found.
            </p>
          ) : (
            filteredConversations.map((conv) => {
              const other = conv.otherUser;
              const isCurrent = conv.id === activeConversationId;
              const isForwarded = forwardedList.includes(conv.id);
              const isSending = forwardingTo === conv.id;

              return (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {other?.avatarUrl ? (
                      <img
                        src={other.avatarUrl}
                        alt={other.username}
                        className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-900 capitalize">
                        {other?.username || 'Chat'}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] text-zinc-400">Current chat</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSending || isForwarded}
                    onClick={() => handleForward(conv.id)}
                    className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isForwarded
                        ? 'bg-zinc-100 text-zinc-500 cursor-default'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    } disabled:opacity-50`}
                  >
                    {isForwarded ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Sent</span>
                      </>
                    ) : isSending ? (
                      <span>Sending...</span>
                    ) : (
                      <span>Forward</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-zinc-100 p-2.5 bg-zinc-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
