import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation, Message } from "@/types/messages";
import { RealtimeChannel } from "@supabase/supabase-js";

export const useConversationList = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Step 1: Get user's conversation IDs
      const { data: participantData, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (participantError) {
        console.error("Error fetching participations:", participantError);
        setError("Erro ao carregar conversas");
        setIsLoading(false);
        return;
      }

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const conversationIds = participantData.map((p) => p.conversation_id);

      // Step 2: Fetch conversations with participants
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select(`
          id,
          updated_at,
          conversation_participants (
            user_id,
            profiles:user_id (
              username,
              display_name,
              avatar_url,
              is_verified,
              verification_type
            )
          )
        `)
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
        setError("Erro ao carregar conversas");
        setIsLoading(false);
        return;
      }

      // Step 3: Fetch last messages and unread counts in parallel
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv: any) => {
          const [lastMessageResult, unreadCountResult] = await Promise.all([
            supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("is_read", false)
              .neq("sender_id", user.id),
          ]);

          const otherParticipant = conv.conversation_participants?.find(
            (p: any) => p.user_id !== user.id
          );

          return {
            id: conv.id,
            updated_at: conv.updated_at,
            otherUser: otherParticipant
              ? {
                  id: otherParticipant.user_id,
                  username: otherParticipant.profiles?.username ?? null,
                  display_name: otherParticipant.profiles?.display_name ?? null,
                  avatar_url: otherParticipant.profiles?.avatar_url ?? null,
                  is_verified: otherParticipant.profiles?.is_verified ?? false,
                  verification_type: otherParticipant.profiles?.verification_type ?? null,
                }
              : undefined,
            lastMessage: lastMessageResult.data as Message | undefined,
            unreadCount: unreadCountResult.count || 0,
          } as Conversation;
        })
      );

      setConversations(conversationsWithDetails);
    } catch (err) {
      console.error("Error in fetchConversations:", err);
      setError("Erro inesperado ao carregar conversas");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel: RealtimeChannel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refresh conversation list on any message change
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
};
