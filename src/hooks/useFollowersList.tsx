import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FollowUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_type: string | null;
}

export const useFollowersList = (userId?: string) => {
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);

  const fetchFollowers = useCallback(async () => {
    if (!userId) return;

    setIsLoadingFollowers(true);

    try {
      const { data: followsData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      if (!followsData || followsData.length === 0) {
        setFollowers([]);
        setIsLoadingFollowers(false);
        return;
      }

      const followerIds = followsData.map((f) => f.follower_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified, verification_type")
        .in("id", followerIds);

      setFollowers(profiles || []);
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setIsLoadingFollowers(false);
    }
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;

    setIsLoadingFollowing(true);

    try {
      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (!followsData || followsData.length === 0) {
        setFollowing([]);
        setIsLoadingFollowing(false);
        return;
      }

      const followingIds = followsData.map((f) => f.following_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified, verification_type")
        .in("id", followingIds);

      setFollowing(profiles || []);
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [userId]);

  return {
    followers,
    following,
    isLoadingFollowers,
    isLoadingFollowing,
    fetchFollowers,
    fetchFollowing,
  };
};
