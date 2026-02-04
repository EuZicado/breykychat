import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ReactionType = "like" | "heart" | "laugh" | "wow" | "sad" | "angry";

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionCount {
  type: ReactionType;
  count: number;
  hasUserReacted: boolean;
}

export const useMessageReactions = (conversationId: string | null) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Map<string, MessageReaction[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reactions for all messages in conversation
  const fetchReactions = useCallback(async () => {
    if (!conversationId || !user) return;

    setIsLoading(true);
    try {
      // Get all message IDs in this conversation
      const { data: messages } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId);

      if (!messages?.length) {
        setReactions(new Map());
        return;
      }

      const messageIds = messages.map(m => m.id);

      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds);

      if (error) {
        console.error("Error fetching reactions:", error);
        return;
      }

      // Group reactions by message_id
      const reactionsMap = new Map<string, MessageReaction[]>();
      data?.forEach((reaction) => {
        const existing = reactionsMap.get(reaction.message_id) || [];
        reactionsMap.set(reaction.message_id, [...existing, reaction as MessageReaction]);
      });

      setReactions(reactionsMap);
    } catch (error) {
      console.error("Error in fetchReactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user]);

  // Setup realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    fetchReactions();

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newReaction = payload.new as MessageReaction;
            setReactions((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(newReaction.message_id) || [];
              updated.set(newReaction.message_id, [...existing, newReaction]);
              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            const deletedReaction = payload.old as MessageReaction;
            setReactions((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(deletedReaction.message_id) || [];
              updated.set(
                deletedReaction.message_id,
                existing.filter((r) => r.id !== deletedReaction.id)
              );
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchReactions]);

  // Toggle reaction
  const toggleReaction = useCallback(
    async (messageId: string, reactionType: ReactionType) => {
      if (!user) return;

      const messageReactions = reactions.get(messageId) || [];
      const existingReaction = messageReactions.find(
        (r) => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (error) {
          console.error("Error removing reaction:", error);
        }
      } else {
        // Add reaction
        const { error } = await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType,
        });

        if (error) {
          console.error("Error adding reaction:", error);
        }
      }
    },
    [user, reactions]
  );

  // Get reactions summary for a message
  const getReactionCounts = useCallback(
    (messageId: string): ReactionCount[] => {
      const messageReactions = reactions.get(messageId) || [];
      const counts: Record<ReactionType, { count: number; hasUserReacted: boolean }> = {
        like: { count: 0, hasUserReacted: false },
        heart: { count: 0, hasUserReacted: false },
        laugh: { count: 0, hasUserReacted: false },
        wow: { count: 0, hasUserReacted: false },
        sad: { count: 0, hasUserReacted: false },
        angry: { count: 0, hasUserReacted: false },
      };

      messageReactions.forEach((reaction) => {
        counts[reaction.reaction_type].count++;
        if (reaction.user_id === user?.id) {
          counts[reaction.reaction_type].hasUserReacted = true;
        }
      });

      return Object.entries(counts)
        .filter(([, value]) => value.count > 0)
        .map(([type, value]) => ({
          type: type as ReactionType,
          count: value.count,
          hasUserReacted: value.hasUserReacted,
        }));
    },
    [reactions, user]
  );

  return {
    reactions,
    isLoading,
    toggleReaction,
    getReactionCounts,
    refetch: fetchReactions,
  };
};
