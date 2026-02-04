import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useFollow = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const checkFollowStatus = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    setIsFollowing(!!data);
  }, [user, targetUserId]);

  const fetchCounts = useCallback(async () => {
    if (!targetUserId) return;

    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", targetUserId),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
    ]);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  }, [targetUserId]);

  useEffect(() => {
    checkFollowStatus();
    fetchCounts();
  }, [checkFollowStatus, fetchCounts]);

  const toggleFollow = async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    setIsLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        // Update counts
        await supabase
          .from("profiles")
          .update({ following_count: Math.max(0, followingCount - 1) })
          .eq("id", user.id);

        await supabase
          .from("profiles")
          .update({ followers_count: Math.max(0, followersCount - 1) })
          .eq("id", targetUserId);

        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        // Follow
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

        // Update counts
        await supabase
          .from("profiles")
          .update({ following_count: followingCount + 1 })
          .eq("id", user.id);

        await supabase
          .from("profiles")
          .update({ followers_count: followersCount + 1 })
          .eq("id", targetUserId);

        // Create notification
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          type: "follow",
          from_user_id: user.id,
        });

        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isFollowing,
    isLoading,
    followersCount,
    followingCount,
    toggleFollow,
    refresh: () => {
      checkFollowStatus();
      fetchCounts();
    },
  };
};