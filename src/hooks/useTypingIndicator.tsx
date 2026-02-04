import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface TypingUser {
  user_id: string;
  is_typing: boolean;
}

export const useTypingIndicator = (conversationId: string) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Listen for typing status changes
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          // Refetch typing users
          const { data } = await supabase
            .from("typing_status")
            .select("user_id, is_typing")
            .eq("conversation_id", conversationId)
            .eq("is_typing", true)
            .neq("user_id", user.id);

          setTypingUsers(data?.map((t) => t.user_id) || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!user || !conversationId) return;
    
    // Only update if state changed
    if (isTypingRef.current === isTyping) return;
    isTypingRef.current = isTyping;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Upsert typing status
    await supabase
      .from("typing_status")
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "conversation_id,user_id",
      });

    // Auto-clear typing after 5 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 5000);
    }
  }, [user, conversationId]);

  const startTyping = useCallback(() => {
    setTyping(true);
  }, [setTyping]);

  const stopTyping = useCallback(() => {
    setTyping(false);
  }, [setTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (user && conversationId) {
        supabase
          .from("typing_status")
          .update({ is_typing: false })
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id);
      }
    };
  }, [user, conversationId]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
};
