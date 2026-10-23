import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { ConversationItem, MessageItem } from '@/types/chat.types';

interface ChatState {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  messages: Record<string, MessageItem[]>;
  onlineUsers: string[];
  typingUsers: Record<string, { userId: string; username: string }[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  loadingConversations: false,
  loadingMessages: false,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<ConversationItem[]>) => {
      state.conversations = action.payload;
      state.loadingConversations = false;
    },
    upsertConversation: (state, action: PayloadAction<ConversationItem>) => {
      const index = state.conversations.findIndex(
        (c) => c.id === action.payload.id
      );
      if (index >= 0) {
        state.conversations[index] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: MessageItem[] }>
    ) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
      state.loadingMessages = false;
    },
    addMessage: (state, action: PayloadAction<MessageItem>) => {
      const msg = action.payload;
      const convId = msg.conversationId;

      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      if (msg.clientId) {
        const existingIdx = state.messages[convId]!.findIndex(
          (m) => m.clientId === msg.clientId
        );
        if (existingIdx >= 0) {
          const prev = state.messages[convId]![existingIdx];
          state.messages[convId]![existingIdx] = {
            ...msg,
            isRead: msg.isRead ?? prev?.isRead ?? false,
            readAt: msg.readAt ?? prev?.readAt,
          };
          return;
        }
      }

      const duplicateIdx = state.messages[convId]!.findIndex(
        (m) => m.id === msg.id
      );
      if (duplicateIdx >= 0) {
        const prev = state.messages[convId]![duplicateIdx];
        state.messages[convId]![duplicateIdx] = {
          ...msg,
          isRead: msg.isRead ?? prev?.isRead ?? false,
          readAt: msg.readAt ?? prev?.readAt,
        };
      } else {
        state.messages[convId]!.push(msg);
      }

      const conv = state.conversations.find((c) => c.id === convId);
      if (conv) {
        conv.lastMessage = msg;
        conv.updatedAt = msg.createdAt;
        state.conversations.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
    },
    markMessagesAsRead: (
      state,
      action: PayloadAction<{ conversationId: string; readAt?: string; readerId?: string }>
    ) => {
      const { conversationId, readAt, readerId } = action.payload;
      const convMsgs = state.messages[conversationId];
      if (convMsgs) {
        convMsgs.forEach((msg) => {
          if (!readerId || msg.senderId !== readerId) {
            msg.isRead = true;
            if (readAt) msg.readAt = readAt;
          }
        });
      }

      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv?.lastMessage) {
        if (!readerId || conv.lastMessage.senderId !== readerId) {
          conv.lastMessage.isRead = true;
          if (readAt) conv.lastMessage.readAt = readAt;
        }
      }
    },

    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
    setUserStatus: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean }>
    ) => {
      const { userId, isOnline } = action.payload;
      if (isOnline) {
        if (!state.onlineUsers.includes(userId)) {
          state.onlineUsers.push(userId);
        }
      } else {
        state.onlineUsers = state.onlineUsers.filter((id) => id !== userId);
      }
    },
    setUserTyping: (
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        username: string;
      }>
    ) => {
      const { conversationId, userId, username } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (!state.typingUsers[conversationId]!.some((u) => u.userId === userId)) {
        state.typingUsers[conversationId]!.push({ userId, username });
      }
    },
    removeUserTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>
    ) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[
          conversationId
        ]!.filter((u) => u.userId !== userId);
      }
    },
    setLoadingConversations: (state, action: PayloadAction<boolean>) => {
      state.loadingConversations = action.payload;
    },
    setLoadingMessages: (state, action: PayloadAction<boolean>) => {
      state.loadingMessages = action.payload;
    },
  },
});

export const {
  setConversations,
  upsertConversation,
  setActiveConversationId,
  setMessages,
  addMessage,
  markMessagesAsRead,
  setOnlineUsers,
  setUserStatus,
  setUserTyping,
  removeUserTyping,
  setLoadingConversations,
  setLoadingMessages,
} = chatSlice.actions;

export const selectChatState = (state: { chat: ChatState }) => state.chat;

export const selectConversations = createSelector(
  [selectChatState],
  (chat) => chat.conversations
);

export const selectActiveConversationId = createSelector(
  [selectChatState],
  (chat) => chat.activeConversationId
);

export const selectMessagesMap = createSelector(
  [selectChatState],
  (chat) => chat.messages
);

export const selectOnlineUsers = createSelector(
  [selectChatState],
  (chat) => chat.onlineUsers
);

export const selectTypingUsers = createSelector(
  [selectChatState],
  (chat) => chat.typingUsers
);

export const selectActiveConversation = createSelector(
  [selectConversations, selectActiveConversationId],
  (conversations, activeId) =>
    activeId ? conversations.find((c) => c.id === activeId) || null : null
);

export const selectActiveMessages = createSelector(
  [selectMessagesMap, selectActiveConversationId],
  (messagesMap, activeId) =>
    activeId && messagesMap[activeId] ? messagesMap[activeId] : []
);

export const selectActiveTypingUsers = createSelector(
  [selectTypingUsers, selectActiveConversationId],
  (typingMap, activeId) =>
    activeId && typingMap[activeId] ? typingMap[activeId] : []
);

export default chatSlice.reducer;
