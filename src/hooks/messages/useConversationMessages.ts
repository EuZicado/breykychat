import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Message, SendMessageResult } from "@/types/messages";

export const useConversationMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          sticker_url,
          audio_url,
          audio_duration_seconds,
          is_read,
          created_at,
          sender:sender_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("Error fetching messages:", fetchError);
        setError("Erro ao carregar mensagens");
        return;
      }

      setMessages((data as Message[]) || []);
    } catch (err) {
      console.error("Error in fetchMessages:", err);
      setError("Erro inesperado ao carregar mensagens");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender info for the new message
          const newMsg = payload.new as any;
          
          const { data: senderData } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          const fullMessage: Message = {
            id: newMsg.id,
            conversation_id: newMsg.conversation_id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            sticker_url: newMsg.sticker_url,
            audio_url: newMsg.audio_url,
            audio_duration_seconds: newMsg.audio_duration_seconds,
            is_read: newMsg.is_read,
            created_at: newMsg.created_at,
            sender: senderData || undefined,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === fullMessage.id)) {
              return prev;
            }
            return [...prev, fullMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updated.id ? { ...msg, ...updated } : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string, stickerUrl?: string): Promise<SendMessageResult> => {
      if (!user) {
        return { success: false, error: "Usuário não autenticado" };
      }

      if (!conversationId) {
        return { success: false, error: "Conversa não selecionada" };
      }

      if (!content.trim() && !stickerUrl) {
        return { success: false, error: "Mensagem vazia" };
      }

      try {
        const { error: insertError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim() || null,
          sticker_url: stickerUrl || null,
        });

        if (insertError) {
          console.error("Error sending message:", insertError);
          return { success: false, error: "Erro ao enviar mensagem" };
        }

        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);

        return { success: true };
      } catch (err) {
        console.error("Error in sendMessage:", err);
        return { success: false, error: "Erro inesperado ao enviar" };
      }
    },
    [user, conversationId]
  );

  const sendAudioMessage = useCallback(
    async (audioBlob: Blob, durationSeconds: number): Promise<SendMessageResult> => {
      if (!user) {
        return { success: false, error: "Usuário não autenticado" };
      }

      if (!conversationId) {
        return { success: false, error: "Conversa não selecionada" };
      }

      try {
        // Upload audio to storage
        const fileName = `${user.id}/${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio-messages")
          .upload(fileName, audioBlob, {
            contentType: "audio/webm",
            cacheControl: "3600",
          });

        if (uploadError) {
          console.error("Error uploading audio:", uploadError);
          return { success: false, error: "Erro ao enviar áudio" };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("audio-messages")
          .getPublicUrl(uploadData.path);

        // Insert message with audio URL
        const { error: insertError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          audio_url: urlData.publicUrl,
          audio_duration_seconds: durationSeconds,
        });

        if (insertError) {
          console.error("Error sending audio message:", insertError);
          return { success: false, error: "Erro ao enviar mensagem de áudio" };
        }

        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);

        return { success: true };
      } catch (err) {
        console.error("Error in sendAudioMessage:", err);
        return { success: false, error: "Erro inesperado ao enviar áudio" };
      }
    },
    [user, conversationId]
  );

  const markAsRead = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [user, conversationId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendAudioMessage,
    markAsRead,
    refetch: fetchMessages,
  };
};
