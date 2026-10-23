import { describe, it, expect } from 'vitest';
import chatReducer, {
  setConversations,
  setActiveConversationId,
  addMessage,
  markMessagesAsRead,
  setUserTyping,
  removeUserTyping,
  selectActiveConversation,
  selectActiveMessages,
  selectActiveTypingUsers,
} from '../chatSlice';
import type { ConversationItem, MessageItem } from '@/types/chat.types';

describe('chatSlice reducers & memoized selectors', () => {
  const initialConv: ConversationItem = {
    id: 'conv-1',
    createdAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
    otherUser: {
      id: 'user-2',
      username: 'priya',
      email: 'priya@test.com',
    },
    participants: [
      { id: 'user-1', username: 'praveen', email: 'praveen@test.com' },
      { id: 'user-2', username: 'priya', email: 'priya@test.com' },
    ],
    lastMessage: null,
  };

  it('adds a message and updates conversation lastMessage and timestamp', () => {
    let state = chatReducer(undefined, setConversations([initialConv]));

    const newMsg: MessageItem = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      clientId: 'client-1',
      content: 'Hello Priya!',
      createdAt: '2026-10-22T10:05:00.000Z',
      sender: { id: 'user-1', username: 'praveen' },
    };

    state = chatReducer(state, addMessage(newMsg));

    expect(state.messages['conv-1']).toHaveLength(1);
    expect(state.messages['conv-1']![0]!.content).toBe('Hello Priya!');
    expect(state.conversations[0]!.lastMessage?.content).toBe('Hello Priya!');
    expect(state.conversations[0]!.updatedAt).toBe('2026-10-22T10:05:00.000Z');
  });

  it('reconciles optimistic messages and avoids duplicates via clientId', () => {
    let state = chatReducer(undefined, setConversations([initialConv]));

    const optimisticMsg: MessageItem = {
      id: 'client-temp-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      clientId: 'client-uuid-123',
      content: 'Optimistic text',
      createdAt: '2026-10-22T10:10:00.000Z',
      sender: { id: 'user-1', username: 'praveen' },
      status: 'sending',
    };

    // User sends message optimistically
    state = chatReducer(state, addMessage(optimisticMsg));
    expect(state.messages['conv-1']).toHaveLength(1);
    expect(state.messages['conv-1']![0]!.status).toBe('sending');

    // Server acknowledges with real database ID
    const serverConfirmedMsg: MessageItem = {
      id: 'server-db-id-456',
      conversationId: 'conv-1',
      senderId: 'user-1',
      clientId: 'client-uuid-123',
      content: 'Optimistic text',
      createdAt: '2026-10-22T10:10:01.000Z',
      sender: { id: 'user-1', username: 'praveen' },
      status: 'sent',
    };

    state = chatReducer(state, addMessage(serverConfirmedMsg));

    // Must still have length 1 (reconciled, not duplicated)
    expect(state.messages['conv-1']).toHaveLength(1);
    expect(state.messages['conv-1']![0]!.id).toBe('server-db-id-456');
    expect(state.messages['conv-1']![0]!.status).toBe('sent');
  });

  it('marks unread messages as read when markMessagesAsRead is dispatched', () => {
    let state = chatReducer(undefined, setConversations([initialConv]));

    const sentMsg: MessageItem = {
      id: 'msg-read-test-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Have you seen this?',
      createdAt: '2026-10-22T10:15:00.000Z',
      sender: { id: 'user-1', username: 'praveen' },
      isRead: false,
      status: 'sent',
    };

    state = chatReducer(state, addMessage(sentMsg));
    expect(state.messages['conv-1']![0]!.isRead).toBe(false);
    expect(state.conversations[0]!.lastMessage?.isRead).toBe(false);

    // Receiver views the message
    state = chatReducer(
      state,
      markMessagesAsRead({
        conversationId: 'conv-1',
        readerId: 'user-2',
        readAt: '2026-10-22T10:16:00.000Z',
      })
    );

    expect(state.messages['conv-1']![0]!.isRead).toBe(true);
    expect(state.messages['conv-1']![0]!.readAt).toBe('2026-10-22T10:16:00.000Z');
    expect(state.conversations[0]!.lastMessage?.isRead).toBe(true);
  });


  it('correctly tracks typing users per conversation', () => {
    let state = chatReducer(undefined, { type: 'init' });

    state = chatReducer(
      state,
      setUserTyping({
        conversationId: 'conv-1',
        userId: 'user-2',
        username: 'priya',
      })
    );

    expect(state.typingUsers['conv-1']).toHaveLength(1);
    expect(state.typingUsers['conv-1']![0]!.username).toBe('priya');

    state = chatReducer(
      state,
      removeUserTyping({
        conversationId: 'conv-1',
        userId: 'user-2',
      })
    );

    expect(state.typingUsers['conv-1']).toHaveLength(0);
  });

  describe('createSelector memoized selectors', () => {
    it('selectActiveConversation returns the active conversation or null', () => {
      const state = {
        chat: {
          conversations: [initialConv],
          activeConversationId: 'conv-1',
          messages: {},
          onlineUsers: [],
          typingUsers: {},
          loadingConversations: false,
          loadingMessages: false,
        },
      };

      const selected = selectActiveConversation(state);
      expect(selected?.id).toBe('conv-1');
      expect(selected?.otherUser?.username).toBe('priya');

      const nullState = {
        chat: {
          ...state.chat,
          activeConversationId: null,
        },
      };
      expect(selectActiveConversation(nullState)).toBeNull();
    });

    it('selectActiveMessages returns messages for the active conversation', () => {
      const msg: MessageItem = {
        id: 'msg-99',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: 'Hi there',
        createdAt: '2026-10-22T11:00:00.000Z',
        sender: { id: 'user-2', username: 'priya' },
      };

      const state = {
        chat: {
          conversations: [initialConv],
          activeConversationId: 'conv-1',
          messages: {
            'conv-1': [msg],
            'conv-2': [],
          },
          onlineUsers: [],
          typingUsers: {},
          loadingConversations: false,
          loadingMessages: false,
        },
      };

      const activeMsgs = selectActiveMessages(state);
      expect(activeMsgs).toHaveLength(1);
      expect(activeMsgs[0]!.content).toBe('Hi there');
    });

    it('selectActiveTypingUsers returns typing indicators for the active conversation', () => {
      const state = {
        chat: {
          conversations: [initialConv],
          activeConversationId: 'conv-1',
          messages: {},
          onlineUsers: [],
          typingUsers: {
            'conv-1': [{ userId: 'user-2', username: 'priya' }],
            'conv-2': [{ userId: 'user-3', username: 'rohit' }],
          },
          loadingConversations: false,
          loadingMessages: false,
        },
      };

      const activeTypers = selectActiveTypingUsers(state);
      expect(activeTypers).toHaveLength(1);
      expect(activeTypers[0]!.username).toBe('priya');
    });
  });
});
