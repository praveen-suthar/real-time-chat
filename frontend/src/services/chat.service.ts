import { apiClient } from '@/lib/apiClient';
import type { ConversationItem, MessageItem } from '@/types/chat.types';

export const chatService = {
  getConversations: async (): Promise<{ conversations: ConversationItem[] }> => {
    const res = await apiClient.get<{ conversations: ConversationItem[] }>('/api/conversations');
    return res.data;
  },

  createOrGetConversation: async (
    targetUserId: string
  ): Promise<{ conversation: ConversationItem }> => {
    const res = await apiClient.post<{ conversation: ConversationItem }>(
      '/api/conversations',
      { targetUserId }
    );
    return res.data;
  },

  getMessages: async (
    conversationId: string
  ): Promise<{ messages: MessageItem[] }> => {
    const res = await apiClient.get<{ messages: MessageItem[] }>(
      `/api/conversations/${conversationId}/messages`
    );
    return res.data;
  },
};
