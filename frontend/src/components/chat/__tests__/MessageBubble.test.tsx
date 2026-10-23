import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import type { MessageItem } from '@/types/chat.types';

describe('MessageBubble Component', () => {
  const baseMessage: MessageItem = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hello testing world',
    createdAt: '2026-10-22T12:30:00.000Z',
    sender: { id: 'user-1', username: 'praveen' },
    status: 'sent',
  };

  it('renders text message content and sender status', () => {
    render(<MessageBubble message={baseMessage} isSelf={true} />);

    expect(screen.getByText('Hello testing world')).toBeInTheDocument();
  });

  it('renders Forwarded indicator when forwardedFromId exists', () => {
    const forwardedMsg: MessageItem = {
      ...baseMessage,
      forwardedFromId: 'orig-msg-999',
    };

    render(<MessageBubble message={forwardedMsg} isSelf={false} />);

    expect(screen.getByText('Forwarded')).toBeInTheDocument();
  });

  it('calls onForward when forward button is clicked', () => {
    const onForwardMock = vi.fn();

    render(
      <MessageBubble
        message={baseMessage}
        isSelf={true}
        onForward={onForwardMock}
      />
    );

    const forwardButton = screen.getByRole('button', { name: /forward message/i });
    fireEvent.click(forwardButton);

    expect(onForwardMock).toHaveBeenCalledWith(baseMessage);
  });

  it('enables native draggable attribute for drag-and-forward', () => {
    render(<MessageBubble message={baseMessage} isSelf={true} />);

    const bubble = screen.getByTitle(/drag to forward to any contact/i);
    expect(bubble).toHaveAttribute('draggable', 'true');
  });

  it('renders image attachment when mediaUrl is present', () => {
    const mediaMsg: MessageItem = {
      ...baseMessage,
      mediaUrl: '/api/media/msg-1',
      mediaType: 'image',
    };

    render(<MessageBubble message={mediaMsg} isSelf={false} />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/media/msg-1');
  });

  it('renders HTML5 video player when mediaType is video', () => {
    const videoMsg: MessageItem = {
      ...baseMessage,
      mediaUrl: '/api/media/msg-video-1',
      mediaType: 'video',
    };

    const { container } = render(<MessageBubble message={videoMsg} isSelf={false} />);

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/api/media/msg-video-1');
    expect(video).toHaveAttribute('controls');
  });
});
