import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type MessagePrivacy = "everyone" | "followers" | "nobody";

interface UserSettings {
  message_privacy: MessagePrivacy;
}

export const useUserSettings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    message_privacy: "everyone",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setSettings({
        message_privacy: (profile as any).message_privacy || "everyone",
      });
      setIsLoading(false);
    }
  }, [profile]);

  const updateMessagePrivacy = useCallback(async (privacy: MessagePrivacy) => {
    if (!user) return false;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ message_privacy: privacy })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating message privacy:", error);
      setIsSaving(false);
      return false;
    }

    setSettings(prev => ({ ...prev, message_privacy: privacy }));
    await refreshProfile();
    setIsSaving(false);
    return true;
  }, [user, refreshProfile]);

  const canSendMessage = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;
    
    // Check using the database function
    const { data, error } = await supabase.rpc("can_send_message", {
      sender_id: user.id,
      receiver_id: targetUserId,
    });

    if (error) {
      console.error("Error checking message permission:", error);
      return false;
    }

    return data || false;
  }, [user]);

  return {
    settings,
    isLoading,
    isSaving,
    updateMessagePrivacy,
    canSendMessage,
  };
};
