import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export const usePresence = (channelName: string = "online-users") => {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(channelName);

    channel
      .on("presence", { event: "sync" }, () => {
        const state: PresenceState = channel.presenceState();
        const userIds = Object.values(state)
          .flat()
          .map((p) => p.user_id);
        setOnlineUsers([...new Set(userIds)]);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        const newUserIds = newPresences.map((p: any) => p.user_id);
        setOnlineUsers((prev) => [...new Set([...prev, ...newUserIds])]);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        const leftUserIds = leftPresences.map((p: any) => p.user_id);
        setOnlineUsers((prev) => prev.filter((id) => !leftUserIds.includes(id)));
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, channelName]);

  const isOnline = useCallback(
    (userId: string) => onlineUsers.includes(userId),
    [onlineUsers]
  );

  return {
    onlineUsers,
    isOnline,
  };
};
