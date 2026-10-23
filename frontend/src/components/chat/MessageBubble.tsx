'use client';

import React, { useState } from 'react';
import type { MessageItem } from '@/types/chat.types';
import { CornerDownRight, Check, CheckCheck, Clock, Forward } from 'lucide-react';

interface MessageBubbleProps {
  message: MessageItem;
  isSelf: boolean;
  onForward?: (message: MessageItem) => void;
  onMediaLoad?: () => void;
}

export function MessageBubble({ message, isSelf, onForward, onMediaLoad }: MessageBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        messageId: message.id,
        content: message.content || '',
        mediaUrl: message.mediaUrl || null,
        mediaType: message.mediaType || null,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`group flex w-full items-end gap-1.5 transition-all ${
        isSelf ? 'justify-end' : 'justify-start'
      }`}
    >
      {isSelf && onForward && (
        <button
          type="button"
          onClick={() => onForward(message)}
          title="Forward message (or drag bubble to contact)"
          aria-label="Forward message"
          className="opacity-60 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 focus:opacity-100 shrink-0"
        >
          <Forward className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        title="Drag to forward to any contact"
        className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-md px-3.5 py-2 text-xs shadow-xs cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? 'opacity-40 scale-[0.98]' : ''
        } ${
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
          <div className="mb-1.5 overflow-hidden rounded-md">
            {message.mediaType === 'video' || message.mediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? (
              <video
                src={message.mediaUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedData={onMediaLoad}
                className="max-h-64 sm:max-h-80 w-full rounded-md object-contain bg-black/95 shadow-xs"
              />
            ) : (
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block cursor-pointer"
              >
                <img
                  src={message.mediaUrl}
                  alt={message.content ? `Attachment: ${message.content.slice(0, 30)}` : 'Shared image attachment'}
                  onLoad={onMediaLoad}
                  className="max-h-56 sm:max-h-72 max-w-full rounded object-cover transition-transform duration-150 hover:scale-[1.01]"
                />
              </a>
            )}
          </div>
        )}

        {message.content && (
          <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
            {message.content}
          </p>
        )}

        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
            isSelf ? 'text-zinc-400' : 'text-zinc-400'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isSelf && (
            <>
              {message.status === 'sending' ? (
                <Clock className="h-2.5 w-2.5 animate-pulse text-zinc-400" />
              ) : message.isRead ? (
                <span title="Viewed by receiver" aria-label="Viewed" className="inline-flex items-center text-sky-400">
                  <CheckCheck className="h-3 w-3 stroke-[2.5]" />
                </span>
              ) : (
                <span title="Sent" aria-label="Sent" className="inline-flex items-center text-zinc-400">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {!isSelf && onForward && (
        <button
          type="button"
          onClick={() => onForward(message)}
          title="Forward message (or drag bubble to contact)"
          aria-label="Forward message"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 focus:opacity-100"
        >
          <Forward className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
