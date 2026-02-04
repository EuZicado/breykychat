import { BadgeCheck, Mic, Sticker } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatPreviewProps {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isVerified?: boolean;
  verificationBadge?: "blue" | "gold" | "staff" | "none" | null;
  isAudioMessage?: boolean;
  isStickerMessage?: boolean;
  onClick: () => void;
  index?: number;
  // Legacy props for backward compatibility
  avatar?: string;
  timestamp?: string;
}

export const ChatPreview = ({
  displayName,
  avatarUrl,
  avatar,
  lastMessage,
  lastMessageTime,
  timestamp,
  unreadCount = 0,
  isOnline,
  isVerified,
  verificationBadge = "blue",
  isAudioMessage = false,
  isStickerMessage = false,
  onClick,
  index = 0,
}: ChatPreviewProps) => {
  const getBadgeColor = () => {
    switch (verificationBadge) {
      case "gold":
        return "text-amber-500";
      case "staff":
        return "text-purple-500";
      default:
        return "text-blue-500";
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Ontem";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("pt-BR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
  };

  const finalAvatar = avatarUrl || avatar;
  const finalTimestamp = timestamp || formatTime(lastMessageTime);
  const finalDisplayName = displayName || "Usuário";

  // Check if it's an audio message from the message content (legacy support)
  const isAudio = isAudioMessage || (lastMessage?.includes("🎤"));

  const getMessagePreview = () => {
    if (isStickerMessage) {
      return "Sticker";
    }
    if (isAudio) {
      return "Mensagem de áudio";
    }
    return lastMessage || "Nenhuma mensagem";
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 active:bg-muted transition-colors"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-14 h-14">
          <AvatarImage src={finalAvatar || undefined} alt={finalDisplayName} className="object-cover" />
          <AvatarFallback className="bg-muted text-lg font-semibold">
            {finalDisplayName?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground truncate">{finalDisplayName}</span>
          {isVerified && (
            <BadgeCheck className={cn("w-4 h-4 flex-shrink-0", getBadgeColor())} />
          )}
        </div>
        <div className={cn(
          "flex items-center gap-1.5 mt-0.5",
          unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
        )}>
          {isStickerMessage && <Sticker className="w-3.5 h-3.5 flex-shrink-0 text-primary" />}
          {isAudio && !isStickerMessage && <Mic className="w-3.5 h-3.5 flex-shrink-0 text-primary" />}
          <p className={cn(
            "text-sm truncate",
            unreadCount > 0 && "font-medium"
          )}>
            {getMessagePreview()}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {finalTimestamp && (
          <span className={cn(
            "text-xs",
            unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {finalTimestamp}
          </span>
        )}
        {unreadCount > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
};
