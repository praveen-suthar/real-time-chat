'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import {
  setMessages,
  setLoadingMessages,
  addMessage,
  markMessagesAsRead,
  setActiveConversationId,
  selectActiveConversation,
  selectActiveMessages,
  selectActiveTypingUsers,
  selectOnlineUsers,
} from '@/store/chatSlice';
import { chatService } from '@/services/chat.service';
import type { MessageItem } from '@/types/chat.types';
import { getSocket } from '@/lib/socket';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import { ForwardModal } from './ForwardModal';
import {
  User as UserIcon,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

export function ChatWindow() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const activeConversationId = useSelector(
    (state: RootState) => state.chat.activeConversationId
  );
  const loadingMessages = useSelector(
    (state: RootState) => state.chat.loadingMessages
  );
  const messagesMap = useSelector(
    (state: RootState) => state.chat.messages
  );

  const activeConversation = useSelector(selectActiveConversation);
  const currentMessages = useSelector(selectActiveMessages);
  const activeTypers = useSelector(selectActiveTypingUsers);
  const onlineUsers = useSelector(selectOnlineUsers);

  const otherUser = activeConversation?.otherUser;
  const isOnline = otherUser?.id ? onlineUsers.includes(otherUser.id) : false;

  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [selectedMessageToForward, setSelectedMessageToForward] =
    useState<MessageItem | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const messageListRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((instant = true) => {
    const el = messageListRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottomBtn(!isNearBottom);
  }, []);

  const loadMessagesForConversation = useCallback(
    (convId: string, signal?: AbortSignal) => {
      dispatch(setLoadingMessages(true));
      setFetchError(null);

      chatService
        .getMessages(convId, signal)
        .then(({ messages }) => {
          dispatch(
            setMessages({
              conversationId: convId,
              messages,
            })
          );
        })
        .catch((err: unknown) => {
          const errorName = (err as { name?: string })?.name;
          if (errorName !== 'CanceledError' && errorName !== 'AbortError') {
            setFetchError('Failed to load messages. Please retry.');
          }
        })
        .finally(() => {
          dispatch(setLoadingMessages(false));
        });
    },
    [dispatch]
  );

  useEffect(() => {
    if (!activeConversationId) return;

    const socket = getSocket();
    socket.emit('join_conversation', { conversationId: activeConversationId });

    const controller = new AbortController();

    if (!messagesMap[activeConversationId]) {
      loadMessagesForConversation(activeConversationId, controller.signal);
    } else {
      setFetchError(null);
    }

    return () => {
      controller.abort();
      socket.emit('leave_conversation', { conversationId: activeConversationId });
    };
  }, [activeConversationId, messagesMap, loadMessagesForConversation]);

  // Re-fetch on reconnect if connection dropped
  useEffect(() => {
    if (!activeConversationId) return;

    const socket = getSocket();
    const handleReconnect = () => {
      loadMessagesForConversation(activeConversationId);
    };

    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [activeConversationId, loadMessagesForConversation]);

  // Mark unread messages as read when viewing conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;

    const unreadFromOther = currentMessages.some(
      (m) => m.senderId !== user.id && !m.isRead
    );

    if (unreadFromOther) {
      const socket = getSocket();
      socket.emit('mark_messages_read', { conversationId: activeConversationId });
      dispatch(
        markMessagesAsRead({
          conversationId: activeConversationId,
          readerId: user.id,
        })
      );
    }
  }, [activeConversationId, currentMessages, user, dispatch]);

  // Also handle window visibility and focus
  useEffect(() => {
    if (!activeConversationId || !user) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const socket = getSocket();
        socket.emit('mark_messages_read', { conversationId: activeConversationId });
        dispatch(
          markMessagesAsRead({
            conversationId: activeConversationId,
            readerId: user.id,
          })
        );
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [activeConversationId, user, dispatch]);


  useLayoutEffect(() => {
    scrollToBottom(true);
    const rId = requestAnimationFrame(() => {
      scrollToBottom(true);
    });
    const tId = setTimeout(() => {
      scrollToBottom(true);
    }, 40);

    return () => {
      cancelAnimationFrame(rId);
      clearTimeout(tId);
    };
  }, [activeConversationId, currentMessages.length, loadingMessages, scrollToBottom]);

  const handleSendMessage = ({
    content,
    mediaUrl,
    mediaType,
  }: {
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  }) => {
    if (!activeConversationId || !user) return;
    if (!content.trim() && !mediaUrl) return;

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMsg: MessageItem = {
      id: clientId,
      conversationId: activeConversationId,
      senderId: user.id,
      clientId,
      content,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      status: 'sending',
    };

    dispatch(addMessage(optimisticMsg));

    const socket = getSocket();
    socket.emit(
      'send_message',
      {
        conversationId: activeConversationId,
        content,
        clientId,
        mediaUrl,
        mediaType,
      },
      (ack: { success: boolean; message?: MessageItem; error?: string }) => {
        if (ack?.success && ack.message) {
          dispatch(addMessage(ack.message));
        }
      }
    );
  };

  const handleOpenForward = (message: MessageItem) => {
    setSelectedMessageToForward(message);
    setForwardModalOpen(true);
  };

  const handleForwardToConversation = (targetConvId: string) => {
    if (!selectedMessageToForward || !user) return;

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const optimisticForward: MessageItem = {
      id: clientId,
      conversationId: targetConvId,
      senderId: user.id,
      clientId,
      content: selectedMessageToForward.content || '',
      mediaUrl: selectedMessageToForward.mediaUrl || null,
      mediaType: selectedMessageToForward.mediaType || null,
      forwardedFromId: selectedMessageToForward.id,
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      status: 'sending',
    };

    dispatch(addMessage(optimisticForward));

    const socket = getSocket();
    socket.emit(
      'send_message',
      {
        conversationId: targetConvId,
        clientId,
        content: selectedMessageToForward.content || '',
        mediaUrl: selectedMessageToForward.mediaUrl || undefined,
        mediaType: selectedMessageToForward.mediaType || undefined,
        forwardedFromId: selectedMessageToForward.id,
      },
      (ack: { success: boolean; message?: MessageItem; error?: string }) => {
        if (ack?.success && ack.message) {
          dispatch(addMessage(ack.message));
        }
      }
    );
  };

  if (!activeConversationId) {
    return (
      <div className="hidden md:flex h-full flex-1 flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 mb-3">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-800">
          No conversation selected
        </h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm">
          Choose a contact from the sidebar or start a new conversation to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full md:flex-1 flex-col bg-white overflow-hidden min-h-0">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 sm:px-4 sm:py-3 bg-white shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              dispatch(setActiveConversationId(null));
              if (typeof window !== 'undefined') {
                localStorage.removeItem('chatapp_active_conversation_id');
              }
            }}
            title="Back to conversations"
            aria-label="Back to conversations"
            className="flex md:hidden items-center justify-center -ml-1 mr-1 h-8 w-8 rounded-full text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 focus:outline-none shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="relative shrink-0">
            {otherUser?.avatarUrl ? (
              <img
                src={otherUser.avatarUrl}
                alt={otherUser.username}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 capitalize truncate">
              {otherUser?.username || 'Chat'}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
              {activeTypers.length > 0 ? (
                <span className="text-zinc-500 italic animate-pulse">
                  typing...
                </span>
              ) : isOnline ? (
                <span className="text-emerald-600 font-medium">Online</span>
              ) : (
                <span className="text-zinc-400">Offline</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-2.5 sm:space-y-3 bg-zinc-50/40 overscroll-contain"
      >
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-zinc-400">Loading messages...</p>
          </div>
        ) : fetchError ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
            <p className="text-xs text-zinc-700 font-medium">{fetchError}</p>
            <button
              type="button"
              onClick={() => loadMessagesForConversation(activeConversationId)}
              className="mt-3 flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        ) : currentMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-xs text-zinc-400">
              No messages yet in this conversation.
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Say hello to start the chat!
            </p>
          </div>
        ) : (
          currentMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === user?.id}
              onForward={handleOpenForward}
              onMediaLoad={() => scrollToBottom(true)}
            />
          ))
        )}
      </div>

      {showScrollBottomBtn && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
          className="absolute bottom-16 right-4 sm:bottom-18 sm:right-6 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-700 shadow-md border border-zinc-200 transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      <div className="shrink-0">
        <Composer
          conversationId={activeConversationId}
          onSendMessage={handleSendMessage}
        />
      </div>

      <ForwardModal
        isOpen={forwardModalOpen}
        message={selectedMessageToForward}
        onClose={() => {
          setForwardModalOpen(false);
          setSelectedMessageToForward(null);
        }}
        onForward={handleForwardToConversation}
      />
    </div>
  );
}
