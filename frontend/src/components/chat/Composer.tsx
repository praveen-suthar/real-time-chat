'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { Send } from 'lucide-react';

interface ComposerProps {
  conversationId: string;
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function Composer({
  conversationId,
  onSendMessage,
  disabled = false,
}: ComposerProps) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        const socket = getSocket();
        socket.emit('typing_stop', { conversationId });
        isTypingRef.current = false;
      }
    };
  }, [conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    const socket = getSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { conversationId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing_stop', { conversationId });
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      const socket = getSocket();
      socket.emit('typing_stop', { conversationId });
      isTypingRef.current = false;
    }

    onSendMessage(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={handleSend}
      className="flex items-center gap-2 border-t border-zinc-200 bg-white p-3"
    >
      <input
        type="text"
        value={text}
        onChange={handleInputChange}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
      />

      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
