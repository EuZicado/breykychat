import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SearchableUser } from "@/types/messages";

export const useUserSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .neq("id", user.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) {
        console.error("Error searching users:", error);
        setResults([]);
        return;
      }

      // Check message permissions in parallel
      const usersWithPermissions = await Promise.all(
        (profiles || []).map(async (profile) => {
          try {
            const { data: canMessage, error: rpcError } = await supabase.rpc(
              "can_send_message",
              {
                sender_id: user.id,
                receiver_id: profile.id,
              }
            );

            return {
              ...profile,
              can_message: rpcError ? true : (canMessage ?? true),
            } as SearchableUser;
          } catch {
            return { ...profile, can_message: true } as SearchableUser;
          }
        })
      );

      setResults(usersWithPermissions);
    } catch (err) {
      console.error("Error in searchUsers:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchUsers]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    clearSearch,
  };
};
