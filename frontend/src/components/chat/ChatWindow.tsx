'use client';

import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setMessages, setLoadingMessages, addMessage } from '@/store/chatSlice';
import { chatService } from '@/services/chat.service';
import type { MessageItem } from '@/types/chat.types';
import { getSocket } from '@/lib/socket';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import { User as UserIcon, MessageSquare } from 'lucide-react';

export function ChatWindow() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const {
    conversations,
    activeConversationId,
    messages,
    onlineUsers,
    typingUsers,
    loadingMessages,
  } = useSelector((state: RootState) => state.chat);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const otherUser = activeConversation?.otherUser;
  const currentMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  const isOnline = otherUser?.id ? onlineUsers.includes(otherUser.id) : false;
  const activeTypers = activeConversationId
    ? typingUsers[activeConversationId] || []
    : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!activeConversationId) return;

    const socket = getSocket();
    socket.emit('join_conversation', { conversationId: activeConversationId });

    if (!messages[activeConversationId]) {
      dispatch(setLoadingMessages(true));
      chatService
        .getMessages(activeConversationId)
        .then(({ messages }) => {
          dispatch(
            setMessages({
              conversationId: activeConversationId,
              messages,
            })
          );
        })
        .catch((err) => console.error(err))
        .finally(() => dispatch(setLoadingMessages(false)));
    }

    return () => {
      socket.emit('leave_conversation', { conversationId: activeConversationId });
    };
  }, [activeConversationId, dispatch, messages]);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages.length]);

  const handleSendMessage = (content: string) => {
    if (!activeConversationId || !user) return;

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMsg: MessageItem = {
      id: clientId,
      conversationId: activeConversationId,
      senderId: user.id,
      clientId,
      content,
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
      },
      (ack: { success: boolean; message?: MessageItem; error?: string }) => {
        if (ack?.success && ack.message) {
          dispatch(addMessage({ ...ack.message, status: 'sent' }));
        }
      }
    );
  };

  if (!activeConversationId || !activeConversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-zinc-50/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-900">
          No conversation selected
        </h3>
        <p className="mt-1 max-w-xs text-xs text-zinc-500">
          Choose a conversation from the sidebar or start a new chat to begin messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            {otherUser?.avatarUrl ? (
              <img
                src={otherUser.avatarUrl}
                alt={otherUser.username}
                className="h-9 w-9 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>

          <div>
            <h2 className="text-xs font-semibold text-zinc-900 capitalize">
              {otherUser?.username || 'Chat'}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              {activeTypers.length > 0 ? (
                <span className="text-zinc-500 italic animate-pulse">
                  typing...
                </span>
              ) : isOnline ? (
                <span className="text-emerald-600">Online</span>
              ) : (
                <span className="text-zinc-400">Offline</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/40">
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-zinc-400">Loading messages...</p>
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
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <Composer
        conversationId={activeConversationId}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
