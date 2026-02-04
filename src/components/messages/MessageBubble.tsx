import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioMessage } from "./AudioMessage";
import { ReactionType, ReactionCount } from "@/hooks/useMessageReactions";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  messageId: string;
  content: string | null;
  stickerUrl: string | null;
  audioUrl?: string | null;
  audioDuration?: number | null;
  isOwn: boolean;
  isRead: boolean;
  timestamp: string;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  reactions?: ReactionCount[];
  onToggleReaction?: (messageId: string, type: ReactionType) => void;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: "👍",
  heart: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😠",
};

const QUICK_REACTIONS: ReactionType[] = ["heart", "like", "laugh"];

export const MessageBubble = ({
  messageId,
  content,
  stickerUrl,
  audioUrl,
  audioDuration,
  isOwn,
  isRead,
  timestamp,
  showAvatar,
  avatarUrl,
  reactions = [],
  onToggleReaction,
}: MessageBubbleProps) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasAudio = !!audioUrl;
  const hasSticker = !!stickerUrl;
  const hasTextContent = !!content && content.trim().length > 0;

  const handleLongPress = () => {
    setShowReactionPicker(true);
  };

  const handleReactionClick = (type: ReactionType) => {
    onToggleReaction?.(messageId, type);
    setShowReactionPicker(false);
  };

  return (
    <div className="relative group">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowReactionPicker(true);
        }}
      >
        {!isOwn && showAvatar && (
          <Avatar className="w-6 h-6">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xs">U</AvatarFallback>
          </Avatar>
        )}
        {!isOwn && !showAvatar && <div className="w-6" />}

        <div className="relative">
          {/* Quick reaction button on hover */}
          {onToggleReaction && (
            <motion.button
              initial={{ opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                isOwn ? "-left-8" : "-right-8"
              )}
              onClick={() => handleReactionClick("heart")}
            >
              <span className="text-lg drop-shadow-sm">❤️</span>
            </motion.button>
          )}

          {/* Message bubble */}
          <div
            className={cn(
              "max-w-[75vw] rounded-2xl px-4 py-2",
              isOwn
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm",
              hasSticker && "bg-transparent px-0 py-0"
            )}
          >
            {hasAudio ? (
              <AudioMessage
                audioUrl={audioUrl!}
                duration={audioDuration || undefined}
                isOwn={isOwn}
              />
            ) : hasSticker ? (
              <motion.img
                src={stickerUrl!}
                alt="Sticker"
                className="w-28 h-28 object-contain"
                whileTap={{ scale: 0.95 }}
              />
            ) : hasTextContent ? (
              <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Mensagem vazia</p>
            )}

            {!hasSticker && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                <span
                  className={cn(
                    "text-[10px]",
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {formatTime(timestamp)}
                </span>
                {isOwn && (
                  <span className="text-primary-foreground/70">
                    {isRead ? (
                      <CheckCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Reactions display */}
          {reactions.length > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "absolute -bottom-3 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-background/95 backdrop-blur-sm border border-border/50 shadow-sm",
                isOwn ? "right-2" : "left-2"
              )}
            >
              {reactions.slice(0, 3).map((reaction) => (
                <motion.button
                  key={reaction.type}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleReactionClick(reaction.type)}
                  className={cn(
                    "flex items-center gap-0.5 text-xs rounded-full transition-colors",
                    reaction.hasUserReacted && "bg-primary/20"
                  )}
                >
                  <span className="text-sm">{REACTION_EMOJIS[reaction.type]}</span>
                  {reaction.count > 1 && (
                    <span className="text-[10px] text-muted-foreground pr-0.5">
                      {reaction.count}
                    </span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Reaction picker */}
          <AnimatePresence>
            {showReactionPicker && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowReactionPicker(false)}
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 10 }}
                  transition={{ type: "spring", damping: 25, stiffness: 400 }}
                  className={cn(
                    "absolute z-50 flex items-center gap-1 p-2 rounded-2xl bg-background/95 backdrop-blur-xl border border-border shadow-xl",
                    isOwn ? "right-0 -top-14" : "left-0 -top-14"
                  )}
                >
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji], index) => (
                    <motion.button
                      key={type}
                      initial={{ scale: 0, y: 10 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{
                        delay: index * 0.03,
                        type: "spring",
                        damping: 20,
                        stiffness: 400,
                      }}
                      whileHover={{ scale: 1.3, y: -4 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReactionClick(type as ReactionType)}
                      className="w-10 h-10 flex items-center justify-center text-xl hover:bg-muted rounded-full transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Add spacing when reactions are shown */}
      {reactions.length > 0 && <div className="h-3" />}
    </div>
  );
};
