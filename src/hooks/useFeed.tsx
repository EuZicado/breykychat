import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface FeedPost {
  id: string;
  creator_id: string;
  content_url: string | null;
  content_type: "video" | "image" | "text";
  description: string | null;
  tags: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  engagement_score: number;
  created_at: string;
  creator_username: string | null;
  creator_display_name: string | null;
  creator_avatar_url: string | null;
  creator_is_verified: boolean;
  creator_verification_type: "none" | "blue" | "gold" | "staff";
  rank_score: number;
  is_liked?: boolean;
}

export const useFeed = (limit: number = 20) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (reset: boolean = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      
      const { data, error } = await supabase.rpc("get_ranked_feed", {
        p_user_id: user?.id || null,
        p_limit: limit,
        p_offset: currentOffset,
      });

      if (error) {
        console.error("Error fetching feed:", error);
        setIsLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setHasMore(false);
        if (reset) {
          setPosts([]);
        }
        setIsLoading(false);
        return;
      }

      // Check if user has liked each post
      let processedData = [...data];
      if (user) {
        const postIds = data.map((p: FeedPost) => p.id);
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        const likedPostIds = new Set(likes?.map((l) => l.post_id) || []);
        
        processedData = data.map((post: FeedPost) => ({
          ...post,
          is_liked: likedPostIds.has(post.id),
        }));
      }

      if (reset) {
        setPosts(processedData);
        setOffset(limit);
      } else {
        setPosts((prev) => [...prev, ...processedData]);
        setOffset(currentOffset + limit);
      }

      setHasMore(data.length === limit);
      setIsLoading(false);
    } catch (err) {
      console.error("Network error fetching feed:", err);
      setIsLoading(false);
    }
  }, [user, limit, offset]);

  useEffect(() => {
    fetchPosts(true);
  }, [user?.id]);

  const likePost = async (postId: string) => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.is_liked;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !wasLiked, likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );

    try {
      if (wasLiked) {
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        await supabase
          .from("posts")
          .update({ likes_count: Math.max(0, post.likes_count - 1) })
          .eq("id", postId);
      } else {
        // Like
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        await supabase
          .from("posts")
          .update({ likes_count: post.likes_count + 1 })
          .eq("id", postId);

        // Create notification if not own post
        if (post.creator_id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: post.creator_id,
            type: "like",
            from_user_id: user.id,
            post_id: postId,
          });
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: wasLiked, likes_count: post.likes_count }
            : p
        )
      );
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchPosts();
    }
  };

  const refresh = () => {
    setIsLoading(true);
    setOffset(0);
    setHasMore(true);
    fetchPosts(true);
  };

  return {
    posts,
    isLoading,
    hasMore,
    likePost,
    loadMore,
    refresh,
  };
};
