import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CreateConversationResult } from "@/types/messages";

export const useConversationActions = () => {
  const { user } = useAuth();

  const createConversation = useCallback(
    async (participantId: string): Promise<CreateConversationResult> => {
      if (!user) {
        return { success: false, error: "Usuário não autenticado" };
      }

      if (participantId === user.id) {
        return { success: false, error: "Não é possível conversar consigo mesmo" };
      }

      try {
        // Use the security definer function to create conversation
        const { data, error } = await supabase.rpc("create_conversation_with_participants", {
          other_user_id: participantId,
        });

        if (error) {
          console.error("Error creating conversation:", error);
          return { success: false, error: "Erro ao criar conversa" };
        }

        if (!data) {
          return { success: false, error: "Conversa não foi criada" };
        }

        return { success: true, conversationId: data };
      } catch (err) {
        console.error("Error in createConversation:", err);
        return { success: false, error: "Erro inesperado ao criar conversa" };
      }
    },
    [user]
  );

  const checkCanMessage = useCallback(
    async (receiverId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { data, error } = await supabase.rpc("can_send_message", {
          sender_id: user.id,
          receiver_id: receiverId,
        });

        if (error) {
          console.error("Error checking message permission:", error);
          return true; // Default to allowing if check fails
        }

        return data ?? true;
      } catch (err) {
        console.error("Error in checkCanMessage:", err);
        return true;
      }
    },
    [user]
  );

  return {
    createConversation,
    checkCanMessage,
  };
};
