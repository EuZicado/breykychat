import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ConversationParticipant } from "@/types/messages";

export const useOtherParticipant = (conversationId: string | null) => {
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<ConversationParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!user || !conversationId) {
        setOtherUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data: participants, error } = await supabase
          .from("conversation_participants")
          .select(`
            user_id,
            profiles:user_id (
              username,
              display_name,
              avatar_url,
              is_verified,
              verification_type
            )
          `)
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id);

        if (error) {
          console.error("Error fetching other participant:", error);
          setIsLoading(false);
          return;
        }

        if (participants && participants[0]) {
          const participant = participants[0] as any;
          setOtherUser({
            id: participant.user_id,
            username: participant.profiles?.username ?? null,
            display_name: participant.profiles?.display_name ?? null,
            avatar_url: participant.profiles?.avatar_url ?? null,
            is_verified: participant.profiles?.is_verified ?? false,
            verification_type: participant.profiles?.verification_type ?? null,
          });
        }
      } catch (err) {
        console.error("Error in fetchOtherUser:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOtherUser();
  }, [conversationId, user]);

  return { otherUser, isLoading };
};
