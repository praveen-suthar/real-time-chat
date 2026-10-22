'use client';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  setConversations,
  addMessage,
  setOnlineUsers,
  setUserStatus,
  setUserTyping,
  removeUserTyping,
} from '@/store/chatSlice';
import { chatService } from '@/services/chat.service';
import type { MessageItem } from '@/types/chat.types';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';

export function ChatDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    chatService
      .getConversations()
      .then(({ conversations }) => {
        dispatch(setConversations(conversations));
      })
      .catch((err) => console.error('Failed to load conversations:', err));

    const socket = connectSocket();

    socket.on('online_users', (userIds: string[]) => {
      dispatch(setOnlineUsers(userIds));
    });

    socket.on('user_status', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      dispatch(setUserStatus({ userId, isOnline }));
    });

    socket.on(
      'user_typing',
      ({
        conversationId,
        userId,
        username,
      }: {
        conversationId: string;
        userId: string;
        username: string;
      }) => {
        dispatch(setUserTyping({ conversationId, userId, username }));
      }
    );

    socket.on(
      'user_stop_typing',
      ({ conversationId, userId }: { conversationId: string; userId: string }) => {
        dispatch(removeUserTyping({ conversationId, userId }));
      }
    );

    socket.on('new_message', (message: MessageItem) => {
      dispatch(addMessage(message));
    });

    return () => {
      socket.off('online_users');
      socket.off('user_status');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('new_message');
      disconnectSocket();
    };
  }, [dispatch]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-100">
      <div className="flex h-full w-full overflow-hidden bg-white shadow-xs">
        <Sidebar />
        <ChatWindow />
      </div>
    </div>
  );
}
