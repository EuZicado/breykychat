import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  user: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    verification_type: string;
  } | null;
  is_liked?: boolean;
  replies?: Comment[];
}

export const useComments = (postId: string) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        user:profiles!comments_user_id_fkey(username, display_name, avatar_url, is_verified, verification_type)
      `)
      .eq("post_id", postId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      setIsLoading(false);
      return;
    }

    // Check if user has liked each comment
    if (user && data) {
      const commentIds = data.map((c) => c.id);
      const { data: likes } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds);

      const likedCommentIds = new Set(likes?.map((l) => l.comment_id) || []);

      data.forEach((comment: any) => {
        comment.is_liked = likedCommentIds.has(comment.id);
      });
    }

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment: any) => {
        const { data: replies } = await supabase
          .from("comments")
          .select(`
            *,
            user:profiles!comments_user_id_fkey(username, display_name, avatar_url, is_verified, verification_type)
          `)
          .eq("parent_id", comment.id)
          .order("created_at", { ascending: true });

        return {
          ...comment,
          replies: replies || [],
        };
      })
    );

    setComments(commentsWithReplies);
    setIsLoading(false);
  }, [postId, user]);

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchComments]);

  const addComment = async (content: string, parentId?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      })
      .select()
      .single();

    if (!error && data) {
      // Increment comments_count on post
      const { data: postData } = await supabase
        .from("posts")
        .select("comments_count, creator_id")
        .eq("id", postId)
        .single();

      if (postData) {
        await supabase
          .from("posts")
          .update({ comments_count: (postData.comments_count || 0) + 1 })
          .eq("id", postId);

        // Create notification if not own post
        if (postData.creator_id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: postData.creator_id,
            type: "comment",
            from_user_id: user.id,
            post_id: postId,
            comment_id: data.id,
          });
        }
      }

      fetchComments();
    }

    return { data, error };
  };

  const likeComment = async (commentId: string) => {
    if (!user) return;

    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    if (comment.is_liked) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("comment_likes").insert({
        comment_id: commentId,
        user_id: user.id,
      });
    }

    fetchComments();
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (!error) {
      // Decrement comments_count on post
      const { data: postData } = await supabase
        .from("posts")
        .select("comments_count")
        .eq("id", postId)
        .single();

      if (postData) {
        await supabase
          .from("posts")
          .update({ comments_count: Math.max(0, (postData.comments_count || 1) - 1) })
          .eq("id", postId);
      }

      fetchComments();
    }
  };

  return {
    comments,
    isLoading,
    addComment,
    likeComment,
    deleteComment,
    refresh: fetchComments,
  };
};