import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface VoidContent {
  id: string;
  creator_id: string;
  content_url: string | null;
  content_type: "video" | "image" | "text";
  text_content: string | null;
  duration_hours: number;
  expires_at: string;
  views_count: number;
  created_at: string;
  creator?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export const useVoid = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<VoidContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    const { data, error } = await supabase
      .from("ephemeral_content")
      .select(`
        *,
        creator:creator_id (
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching void content:", error);
      setIsLoading(false);
      return;
    }

    setContent(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    const channel = supabase
      .channel("void-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ephemeral_content",
        },
        () => {
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContent]);

  const createVoidContent = async (
    contentType: "video" | "image" | "text",
    durationHours: number,
    textContent?: string,
    file?: File
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    let contentUrl = null;

    if (file) {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("void")
        .upload(fileName, file);

      if (uploadError) {
        return { error: uploadError };
      }

      const { data: urlData } = supabase.storage
        .from("void")
        .getPublicUrl(uploadData.path);

      contentUrl = urlData.publicUrl;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    const { error } = await supabase.from("ephemeral_content").insert({
      creator_id: user.id,
      content_type: contentType,
      content_url: contentUrl,
      text_content: textContent || null,
      duration_hours: durationHours,
      expires_at: expiresAt.toISOString(),
    });

    if (!error) {
      await fetchContent();
    }

    return { error };
  };

  const deleteVoidContent = async (contentId: string) => {
    if (!user) return;

    await supabase.from("ephemeral_content").delete().eq("id", contentId);
    await fetchContent();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return "Expirado";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  return {
    content,
    isLoading,
    createVoidContent,
    deleteVoidContent,
    getTimeRemaining,
    refresh: fetchContent,
  };
};
