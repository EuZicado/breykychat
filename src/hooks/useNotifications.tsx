import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Notification {
  id: string;
  user_id: string;
  type: "like" | "comment" | "follow" | "mention" | "message";
  from_user_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select(`
        *,
        from_user:profiles!notifications_from_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      setIsLoading(false);
      return;
    }

    setNotifications(data as Notification[]);
    setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    const notification = notifications.find((n) => n.id === notificationId);
    if (notification && !notification.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
};