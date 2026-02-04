import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface MutualFollower {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export const useMutualFollowers = (targetUserId?: string) => {
  const { user } = useAuth();
  const [mutualFollowers, setMutualFollowers] = useState<MutualFollower[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMutualFollowers = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) {
      setMutualFollowers([]);
      return;
    }

    setIsLoading(true);

    try {
      // Get users that the current user follows
      const { data: myFollowing } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!myFollowing || myFollowing.length === 0) {
        setMutualFollowers([]);
        setIsLoading(false);
        return;
      }

      const myFollowingIds = myFollowing.map((f) => f.following_id);

      // Get users that also follow the target user
      const { data: targetFollowers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", targetUserId)
        .in("follower_id", myFollowingIds);

      if (!targetFollowers || targetFollowers.length === 0) {
        setMutualFollowers([]);
        setIsLoading(false);
        return;
      }

      const mutualIds = targetFollowers.map((f) => f.follower_id);

      // Get profile info for mutual followers
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", mutualIds)
        .limit(5);

      setMutualFollowers(profiles || []);
    } catch (error) {
      console.error("Error fetching mutual followers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, targetUserId]);

  useEffect(() => {
    fetchMutualFollowers();
  }, [fetchMutualFollowers]);

  return {
    mutualFollowers,
    isLoading,
    refresh: fetchMutualFollowers,
  };
};
