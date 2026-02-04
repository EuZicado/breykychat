import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Loader2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-destructive" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case "mention":
        return <AtSign className="w-5 h-5 text-primary" />;
      case "message":
        return <MessageCircle className="w-5 h-5 text-primary" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationText = (type: string, fromUser: string) => {
    switch (type) {
      case "like":
        return <span><strong>{fromUser}</strong> curtiu sua publicação</span>;
      case "comment":
        return <span><strong>{fromUser}</strong> comentou em sua publicação</span>;
      case "follow":
        return <span><strong>{fromUser}</strong> começou a seguir você</span>;
      case "mention":
        return <span><strong>{fromUser}</strong> mencionou você</span>;
      case "message":
        return <span><strong>{fromUser}</strong> enviou uma mensagem</span>;
      default:
        return <span>Nova notificação</span>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="glass-strong px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold font-display">Notificações</h1>
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications List */}
      <div className="px-4 py-4 pb-24">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Nenhuma notificação</p>
            <p className="text-sm text-muted-foreground">
              Você receberá notificações sobre curtidas, comentários e seguidores aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <motion.button
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id);
                  }
                  if (notification.from_user_id) {
                    navigate(`/user/${notification.from_user_id}`);
                  }
                }}
                className={cn(
                  "w-full ios-list-item flex items-start gap-3 p-3 rounded-xl text-left transition-colors",
                  !notification.is_read && "bg-primary/5 border-l-2 border-primary"
                )}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={notification.from_user?.avatar_url || ""} />
                  <AvatarFallback>
                    {notification.from_user?.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {getNotificationText(
                      notification.type,
                      notification.from_user?.display_name || notification.from_user?.username || "Alguém"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {getNotificationIcon(notification.type)}
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;