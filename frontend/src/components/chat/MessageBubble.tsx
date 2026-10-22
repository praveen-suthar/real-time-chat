'use client';

import React from 'react';
import type { MessageItem } from '@/types/chat.types';
import { CornerDownRight, Check, Clock } from 'lucide-react';

interface MessageBubbleProps {
  message: MessageItem;
  isSelf: boolean;
}

export function MessageBubble({ message, isSelf }: MessageBubbleProps) {
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[75%] rounded-md px-3.5 py-2 text-xs shadow-xs ${
          isSelf
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-900 border border-zinc-200/60'
        }`}
      >
        {message.forwardedFromId && (
          <div
            className={`mb-1 flex items-center gap-1 text-[10px] italic ${
              isSelf ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <CornerDownRight className="h-2.5 w-2.5" />
            <span>Forwarded</span>
          </div>
        )}

        {message.mediaUrl && (
          <div className="mb-1.5 overflow-hidden rounded-sm">
            <img
              src={message.mediaUrl}
              alt="Attachment"
              className="max-h-60 max-w-full object-cover"
            />
          </div>
        )}

        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>

        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
            isSelf ? 'text-zinc-400' : 'text-zinc-400'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isSelf && (
            <>
              {message.status === 'sending' ? (
                <Clock className="h-2.5 w-2.5 animate-pulse" />
              ) : (
                <Check className="h-2.5 w-2.5" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
