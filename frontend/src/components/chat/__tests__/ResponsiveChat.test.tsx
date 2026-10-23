import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/authSlice';
import chatReducer, { setActiveConversationId } from '@/store/chatSlice';
import { Sidebar } from '../Sidebar';
import { ChatWindow } from '../ChatWindow';

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock('@/services/chat.service', () => ({
  chatService: {
    getMessages: vi.fn().mockResolvedValue({ messages: [] }),
    getConversations: vi.fn().mockResolvedValue({ conversations: [] }),
  },
}));

function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      chat: chatReducer,
    },
    preloadedState,
  });
}

describe('Responsive Chat Navigation & Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Sidebar as full-width when no active conversation is selected on mobile', () => {
    const store = createTestStore({
      auth: { user: { id: 'user-1', username: 'praveen' }, token: 'mock-token', isAuthenticated: true, loading: false },
      chat: {
        conversations: [
          {
            id: 'conv-1',
            updatedAt: '2026-10-22T10:00:00Z',
            otherUser: { id: 'user-2', username: 'priya' },
          },
        ],
        activeConversationId: null,
        messages: {},
        onlineUsers: ['user-2'],
        typingUsers: {},
        loadingMessages: false,
      },
    });

    const { container } = render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
    expect(aside?.className).toContain('w-full flex');
    expect(aside?.className).not.toContain('hidden md:flex');
  });

  it('hides Sidebar on mobile when activeConversationId is selected', () => {
    const store = createTestStore({
      auth: { user: { id: 'user-1', username: 'praveen' }, token: 'mock-token', isAuthenticated: true, loading: false },
      chat: {
        conversations: [
          {
            id: 'conv-1',
            updatedAt: '2026-10-22T10:00:00Z',
            otherUser: { id: 'user-2', username: 'priya' },
          },
        ],
        activeConversationId: 'conv-1',
        messages: {},
        onlineUsers: ['user-2'],
        typingUsers: {},
        loadingMessages: false,
      },
    });

    const { container } = render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
    expect(aside?.className).toContain('hidden md:flex');
  });

  it('allows clearing search input in Sidebar', () => {
    const store = createTestStore({
      auth: { user: { id: 'user-1', username: 'praveen' }, token: 'mock-token', isAuthenticated: true, loading: false },
      chat: {
        conversations: [],
        activeConversationId: null,
        messages: {},
        onlineUsers: [],
        typingUsers: {},
        loadingMessages: false,
      },
    });

    render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    const searchInput = screen.getByPlaceholderText('Search chats...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'priya' } });
    expect(searchInput.value).toBe('priya');

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(searchInput.value).toBe('');
  });

  it('renders ChatWindow empty state with hidden md:flex when no conversation selected', () => {
    const store = createTestStore({
      auth: { user: { id: 'user-1', username: 'praveen' }, token: 'mock-token', isAuthenticated: true, loading: false },
      chat: {
        conversations: [],
        activeConversationId: null,
        messages: {},
        onlineUsers: [],
        typingUsers: {},
        loadingMessages: false,
      },
    });

    const { container } = render(
      <Provider store={store}>
        <ChatWindow />
      </Provider>
    );

    const emptyContainer = container.querySelector('div');
    expect(emptyContainer?.className).toContain('hidden md:flex');
    expect(screen.getByText('No conversation selected')).toBeInTheDocument();
  });

  it('renders mobile back button and resets activeConversationId when clicked', () => {
    const store = createTestStore({
      auth: { user: { id: 'user-1', username: 'praveen' }, token: 'mock-token', isAuthenticated: true, loading: false },
      chat: {
        conversations: [
          {
            id: 'conv-1',
            updatedAt: '2026-10-22T10:00:00Z',
            otherUser: { id: 'user-2', username: 'priya' },
          },
        ],
        activeConversationId: 'conv-1',
        messages: {
          'conv-1': [],
        },
        onlineUsers: ['user-2'],
        typingUsers: {},
        loadingMessages: false,
      },
    });

    render(
      <Provider store={store}>
        <ChatWindow />
      </Provider>
    );

    const backButton = screen.getByRole('button', { name: /back to conversations/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton.className).toContain('flex md:hidden');

    fireEvent.click(backButton);
    expect(store.getState().chat.activeConversationId).toBeNull();
  });

  it('displays Draft indicator in Sidebar when unsent draft exists in localStorage', () => {
    localStorage.setItem('chatapp_draft_conv-1', 'Unsent draft for Priya');

    const store = createTestStore({
      auth: { user: { id: 'user-1', username: 'praveen' }, token: 'mock-token', isAuthenticated: true, loading: false },
      chat: {
        conversations: [
          {
            id: 'conv-1',
            updatedAt: '2026-10-22T10:00:00Z',
            otherUser: { id: 'user-2', username: 'priya' },
          },
        ],
        activeConversationId: null,
        messages: {},
        onlineUsers: [],
        typingUsers: {},
        loadingMessages: false,
      },
    });

    render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    expect(screen.getByText('Draft:')).toBeInTheDocument();
    expect(screen.getByText('Unsent draft for Priya')).toBeInTheDocument();
  });

  it('displays Video indicator in Sidebar when last message is video', () => {
    const store = createTestStore({
      auth: { user: { id: 'user-1', username: 'praveen' }, token: 'mock-token', isAuthenticated: true, loading: false },
      chat: {
        conversations: [
          {
            id: 'conv-1',
            updatedAt: '2026-10-22T10:00:00Z',
            otherUser: { id: 'user-2', username: 'priya' },
            lastMessage: {
              id: 'msg-1',
              conversationId: 'conv-1',
              senderId: 'user-2',
              content: '',
              mediaUrl: '/api/media/vid-1',
              mediaType: 'video',
              createdAt: '2026-10-22T10:00:00Z',
            },
          },
        ],
        activeConversationId: null,
        messages: {},
        onlineUsers: [],
        typingUsers: {},
        loadingMessages: false,
      },
    });

    render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    expect(screen.getByText('🎥 Video')).toBeInTheDocument();
  });
});
