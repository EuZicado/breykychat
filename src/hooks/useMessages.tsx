// Legacy hook - Re-exports from new modular structure for backward compatibility

import { useConversationList, useConversationActions, useConversationMessages } from "./messages";

// Combine for backward compatibility
export const useMessages = () => {
  const { conversations, isLoading, error, refetch } = useConversationList();
  const { createConversation: createConv } = useConversationActions();

  const createConversation = async (participantId: string): Promise<string | null> => {
    const result = await createConv(participantId);
    if (result.success && result.conversationId) {
      await refetch();
      return result.conversationId;
    }
    return null;
  };

  return {
    conversations,
    isLoading,
    fetchConversations: refetch,
    createConversation,
  };
};

// Re-export useConversation with the same API
export const useConversation = (conversationId: string) => {
  const { 
    messages, 
    isLoading, 
    sendMessage: send, 
    markAsRead, 
    refetch 
  } = useConversationMessages(conversationId);

  const sendMessage = async (content: string, stickerUrl?: string) => {
    const result = await send(content, stickerUrl);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
    fetchMessages: refetch,
  };
};
