'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { clearAuth } from '@/store/authSlice';
import {
  setActiveConversationId,
  upsertConversation,
  addMessage,
  selectConversations,
  selectOnlineUsers,
} from '@/store/chatSlice';
import { authService } from '@/services/auth.service';
import { getSocket } from '@/lib/socket';
import type { ConversationItem, MessageItem } from '@/types/chat.types';
import { NewChatModal } from './NewChatModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import {
  MessageSquarePlus,
  LogOut,
  Search,
  User as UserIcon,
  CheckCircle2,
  X,
} from 'lucide-react';

export function Sidebar() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const conversations = useSelector(selectConversations);
  const onlineUsers = useSelector(selectOnlineUsers);
  const activeConversationId = useSelector(
    (state: RootState) => state.chat.activeConversationId
  );

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dragOverConvId, setDragOverConvId] = useState<string | null>(null);
  const [justForwardedId, setJustForwardedId] = useState<string | null>(null);

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

  const handleDragOver = (e: React.DragEvent, convId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverConvId !== convId) {
      setDragOverConvId(convId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, convId: string) => {
    e.preventDefault();
    if (dragOverConvId === convId) {
      setDragOverConvId(null);
    }
  };

  const handleDropToForward = (e: React.DragEvent, targetConvId: string) => {
    e.preventDefault();
    setDragOverConvId(null);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.messageId) return;

      const socket = getSocket();
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      socket.emit(
        'send_message',
        {
          conversationId: targetConvId,
          clientId,
          content: data.content || '',
          mediaUrl: data.mediaUrl || undefined,
          mediaType: data.mediaType || undefined,
          forwardedFromId: data.messageId,
        },
        (ack: { success: boolean; message?: MessageItem; error?: string }) => {
          if (ack?.success && ack.message) {
            dispatch(addMessage(ack.message));
            setJustForwardedId(targetConvId);
            setTimeout(() => setJustForwardedId(null), 2500);
          }
        }
      );
    } catch (err) {
      console.error('Drag forward error:', err);
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
      <aside
        className={`flex h-full flex-col border-r border-zinc-200 bg-white md:w-72 lg:w-80 md:shrink-0 min-h-0 overflow-hidden ${
          activeConversationId ? 'hidden md:flex' : 'w-full flex'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 sm:py-3.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="h-8 w-8 rounded-full border border-zinc-200 object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 capitalize truncate">
                {user?.username}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] text-zinc-400">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              title="Start New Chat"
              aria-label="Start New Chat"
              className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              title="Sign Out"
              aria-label="Sign Out"
              className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-zinc-100 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
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

        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-50 overscroll-contain">
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
              const isDragTarget = dragOverConvId === conv.id;
              const isJustForwarded = justForwardedId === conv.id;

              const draftDisplay = (() => {
                if (typeof window === 'undefined') return null;
                const rawDraft = localStorage.getItem(`chatapp_draft_${conv.id}`);
                const rawMedia = localStorage.getItem(`chatapp_draft_media_${conv.id}`);

                let textContent = '';
                let hasMedia = false;
                let isVideo = false;

                if (rawDraft) {
                  try {
                    const parsed = JSON.parse(rawDraft);
                    if (parsed && typeof parsed === 'object') {
                      textContent = parsed.text || '';
                      if (parsed.file) {
                        hasMedia = true;
                        isVideo = parsed.file.type?.startsWith('video/') || false;
                      }
                    } else {
                      textContent = String(rawDraft);
                    }
                  } catch {
                    textContent = rawDraft;
                  }
                }

                if (rawMedia) {
                  try {
                    const parsedMedia = JSON.parse(rawMedia);
                    hasMedia = true;
                    if (parsedMedia.type?.startsWith('video/')) isVideo = true;
                  } catch {
                    hasMedia = true;
                  }
                }

                const trimmed = textContent.trim();
                if (trimmed) {
                  return hasMedia ? `${isVideo ? '🎥 ' : '📷 '}${trimmed}` : trimmed;
                }
                if (hasMedia) {
                  return isVideo ? '🎥 Video' : '📷 Photo';
                }
                return null;
              })();

              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    dispatch(setActiveConversationId(conv.id));
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('chatapp_active_conversation_id', conv.id);
                    }
                  }}
                  onDragOver={(e) => handleDragOver(e, conv.id)}
                  onDragLeave={(e) => handleDragLeave(e, conv.id)}
                  onDrop={(e) => handleDropToForward(e, conv.id)}
                  className={`flex w-full items-center gap-3 p-3 text-left transition-all ${
                    isDragTarget
                      ? 'bg-zinc-100 ring-2 ring-zinc-700 ring-inset scale-[0.99]'
                      : isSelected
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
                    {isDragTarget ? (
                      <p className="text-[11px] font-medium text-zinc-900 animate-pulse mt-0.5">
                        Drop to forward message
                      </p>
                    ) : isJustForwarded ? (
                      <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Message forwarded!</span>
                      </p>
                    ) : draftDisplay && !isSelected ? (
                      <p className="truncate text-[11px] mt-0.5">
                        <span className="text-red-500 font-medium">Draft: </span>
                        <span className="text-zinc-600">{draftDisplay}</span>
                      </p>
                    ) : (
                      <p className="truncate text-[11px] text-zinc-500 mt-0.5">
                        {conv.lastMessage?.content ||
                          (conv.lastMessage?.mediaUrl
                            ? conv.lastMessage.mediaType === 'video'
                              ? '🎥 Video'
                              : '📷 Photo'
                            : 'No messages yet')}
                      </p>
                    )}
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
          if (typeof window !== 'undefined') {
            localStorage.setItem('chatapp_active_conversation_id', conv.id);
          }
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
