import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Composer } from '../Composer';

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({
    emit: vi.fn(),
  }),
}));

describe('Composer Component', () => {
  const convId = 'conv-test-123';
  const onSendMessageMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders input, attach button, and disabled send button when empty', () => {
    render(<Composer conversationId={convId} onSendMessage={onSendMessageMock} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    expect(input).toBeInTheDocument();
    expect(sendButton).toBeDisabled();
  });

  it('restores draft from localStorage when mounted', () => {
    localStorage.setItem(`chatapp_draft_${convId}`, 'Unsent saved draft');

    render(<Composer conversationId={convId} onSendMessage={onSendMessageMock} />);

    const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    expect(input.value).toBe('Unsent saved draft');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).not.toBeDisabled();
  });

  it('saves typing input to localStorage as draft', () => {
    render(<Composer conversationId={convId} onSendMessage={onSendMessageMock} />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Drafting a new message' } });

    expect(localStorage.getItem(`chatapp_draft_${convId}`)).toBe('Drafting a new message');
  });

  it('submits message and clears input and draft', () => {
    render(<Composer conversationId={convId} onSendMessage={onSendMessageMock} />);

    const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Sending test message' } });

    const sendButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(sendButton);

    expect(onSendMessageMock).toHaveBeenCalledWith({
      content: 'Sending test message',
      mediaUrl: undefined,
      mediaType: undefined,
    });

    expect(input.value).toBe('');
    expect(localStorage.getItem(`chatapp_draft_${convId}`)).toBeNull();
  });

  it('displays error when an oversized image (>10MB) is selected', () => {
    render(<Composer conversationId={convId} onSendMessage={onSendMessageMock} />);

    const fileInput = screen.getByLabelText(/upload image/i);
    const largeFile = new File([''], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByText('Image size must be less than 10MB')).toBeInTheDocument();
  });

  it('accepts video file attachment and shows preview', () => {
    const { container } = render(<Composer conversationId={convId} onSendMessage={onSendMessageMock} />);

    const fileInput = screen.getByLabelText(/upload image/i);
    const videoFile = new File(['mock video data'], 'demo.mp4', { type: 'video/mp4' });
    Object.defineProperty(videoFile, 'size', { value: 5 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [videoFile] } });

    expect(screen.getByText('demo.mp4')).toBeInTheDocument();
    const videoPreview = container.querySelector('video');
    expect(videoPreview).toBeInTheDocument();
  });

  it('displays error when an oversized video (>50MB) is selected', () => {
    render(<Composer conversationId={convId} onSendMessage={onSendMessageMock} />);

    const fileInput = screen.getByLabelText(/upload image/i);
    const hugeVideo = new File([''], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(hugeVideo, 'size', { value: 55 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [hugeVideo] } });

    expect(screen.getByText('Video size must be less than 50MB')).toBeInTheDocument();
  });
});
