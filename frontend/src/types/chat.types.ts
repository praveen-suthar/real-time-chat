import { User } from './auth.types';

export interface MessageSender {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  clientId?: string | null;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  forwardedFromId?: string | null;
  createdAt: string;
  sender: MessageSender;
  status?: 'sending' | 'sent' | 'error';
}

export interface ConversationItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  otherUser?: User | null;
  participants: User[];
  lastMessage?: MessageItem | null;
}
