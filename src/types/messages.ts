// Centralized message types for the messaging system

export interface MessageSender {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  sticker_url: string | null;
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  is_read: boolean;
  created_at: string;
  sender?: MessageSender;
}

export interface ConversationParticipant {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_type?: "none" | "blue" | "gold" | "staff" | null;
}

export interface Conversation {
  id: string;
  updated_at: string;
  otherUser?: ConversationParticipant;
  lastMessage?: Message;
  unreadCount: number;
}

export interface SearchableUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  can_message: boolean;
}

export type SendMessageResult = {
  success: boolean;
  error?: string;
};

export type CreateConversationResult = {
  success: boolean;
  conversationId?: string;
  error?: string;
};
