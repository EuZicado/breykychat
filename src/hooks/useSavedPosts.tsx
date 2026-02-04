import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SavedPost {
  id: string;
  post_id: string;
  created_at: string;
  post: {
    id: string;
    content_url: string | null;
    content_type: string;
    description: string | null;
    likes_count: number;
    creator: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

export const useSavedPosts = () => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchSavedPosts = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("saved_posts")
      .select(`
        *,
        post:posts(
          id,
          content_url,
          content_type,
          description,
          likes_count,
          creator:profiles!posts_creator_id_fkey(username, display_name, avatar_url)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved posts:", error);
      setIsLoading(false);
      return;
    }

    setSavedPosts(data || []);
    setSavedPostIds(new Set((data || []).map((sp) => sp.post_id)));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  const toggleSavePost = async (postId: string) => {
    if (!user) return;

    const isSaved = savedPostIds.has(postId);

    if (isSaved) {
      // Unsave
      await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      setSavedPostIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      // Save
      await supabase.from("saved_posts").insert({
        post_id: postId,
        user_id: user.id,
      });

      setSavedPostIds((prev) => new Set([...prev, postId]));
    }

    fetchSavedPosts();
  };

  const isPostSaved = (postId: string) => savedPostIds.has(postId);

  return {
    savedPosts,
    isLoading,
    toggleSavePost,
    isPostSaved,
    refresh: fetchSavedPosts,
  };
};