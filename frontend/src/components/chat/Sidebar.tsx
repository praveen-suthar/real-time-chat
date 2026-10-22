'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { clearAuth } from '@/store/authSlice';
import { setActiveConversationId, upsertConversation } from '@/store/chatSlice';
import { authService } from '@/services/auth.service';
import type { ConversationItem } from '@/types/chat.types';
import { NewChatModal } from './NewChatModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import {
  MessageSquarePlus,
  LogOut,
  Search,
  User as UserIcon,
} from 'lucide-react';

export function Sidebar() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { conversations, activeConversationId, onlineUsers } = useSelector(
    (state: RootState) => state.chat
  );

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await authService.logout();
    } catch {
    } finally {
      setLoggingOut(false);
      setLogoutModalOpen(false);
      dispatch(clearAuth());
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <aside className="flex h-full w-full flex-col border-r border-zinc-200 bg-white md:w-80">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            {user?.avatarUrl ? (
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
              <p className="text-xs font-semibold text-zinc-900 capitalize">
                {user?.username}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-zinc-400">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              title="Start New Chat"
              aria-label="Start New Chat"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              title="Sign Out"
              aria-label="Sign Out"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-xs text-zinc-400">No conversations yet.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-2 text-xs font-medium text-zinc-900 underline hover:text-zinc-700"
              >
                Start a chat
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUser = conv.otherUser;
              const isSelected = conv.id === activeConversationId;
              const isOnline = otherUser?.id
                ? onlineUsers.includes(otherUser.id)
                : false;

              return (
                <button
                  key={conv.id}
                  onClick={() => dispatch(setActiveConversationId(conv.id))}
                  className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-zinc-100/80 border-r-2 border-zinc-900'
                      : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    {otherUser?.avatarUrl ? (
                      <img
                        src={otherUser.avatarUrl}
                        alt={otherUser.username}
                        className="h-10 w-10 rounded-full border border-zinc-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                        <UserIcon className="h-5 w-5" />
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-semibold text-zinc-900 capitalize">
                        {otherUser?.username || 'Chat'}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-zinc-400">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-zinc-500 mt-0.5">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <NewChatModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectConversation={(conv: ConversationItem) => {
          dispatch(upsertConversation(conv));
          dispatch(setActiveConversationId(conv.id));
        }}
      />

      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </>
  );
}
