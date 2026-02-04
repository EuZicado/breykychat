import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SearchUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  verification_type: string;
  followers_count: number;
}

interface SearchPost {
  id: string;
  content_url: string | null;
  description: string | null;
  likes_count: number;
  creator: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useSearch = () => {
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, is_verified, verification_type, followers_count")
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(20);

    if (error) {
      console.error("Error searching users:", error);
      return;
    }

    setUsers(data || []);
  }, []);

  const searchPosts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setPosts([]);
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        content_url,
        description,
        likes_count,
        creator:profiles!posts_creator_id_fkey(username, display_name, avatar_url)
      `)
      .or(`description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      .order("likes_count", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error searching posts:", error);
      return;
    }

    setPosts(data || []);
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    setIsLoading(true);

    await Promise.all([
      searchUsers(searchQuery),
      searchPosts(searchQuery),
    ]);

    setIsLoading(false);
  }, [searchUsers, searchPosts]);

  const getSuggestedUsers = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, is_verified, verification_type, followers_count")
      .not("username", "is", null)
      .order("followers_count", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching suggested users:", error);
      setIsLoading(false);
      return;
    }

    setUsers(data || []);
    setIsLoading(false);
  }, []);

  const clear = () => {
    setUsers([]);
    setPosts([]);
    setQuery("");
  };

  return {
    users,
    posts,
    isLoading,
    query,
    search,
    searchUsers,
    searchPosts,
    getSuggestedUsers,
    clear,
  };
};