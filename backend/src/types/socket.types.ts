export interface SendMessagePayload {
  conversationId: string;
  content: string;
  clientId?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  forwardedFromId?: string | null;
}

export interface SendMessageAck {
  success: boolean;
  message?: unknown;
  error?: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface JoinLeavePayload {
  conversationId: string;
}

export interface MarkMessagesReadPayload {
  conversationId: string;
}

export interface MessagesReadEvent {
  conversationId: string;
  readerId: string;
  readAt: string;
}
