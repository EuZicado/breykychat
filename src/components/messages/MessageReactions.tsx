import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactionType, ReactionCount } from "@/hooks/useMessageReactions";

interface MessageReactionsProps {
  messageId: string;
  isOwn: boolean;
  reactions: ReactionCount[];
  onToggleReaction: (messageId: string, type: ReactionType) => void;
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

export const MessageReactions = ({
  messageId,
  isOwn,
  reactions,
  onToggleReaction,
}: MessageReactionsProps) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      {/* Existing reactions display */}
      {reactions.length > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm",
            isOwn ? "-mt-2 mr-2" : "-mt-2 ml-2"
          )}
        >
          {reactions.map((reaction) => (
            <motion.button
              key={reaction.type}
              whileTap={{ scale: 0.85 }}
              onClick={() => onToggleReaction(messageId, reaction.type)}
              className={cn(
                "flex items-center gap-0.5 text-xs rounded-full px-1 py-0.5 transition-colors",
                reaction.hasUserReacted && "bg-primary/20"
              )}
            >
              <span>{REACTION_EMOJIS[reaction.type]}</span>
              {reaction.count > 1 && (
                <span className="text-[10px] text-muted-foreground">{reaction.count}</span>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Reaction picker trigger */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className={cn(
              "absolute z-50 flex items-center gap-1 p-2 rounded-2xl bg-background/95 backdrop-blur-xl border border-border shadow-xl",
              isOwn ? "right-0 -top-12" : "left-0 -top-12"
            )}
          >
            {Object.entries(REACTION_EMOJIS).map(([type, emoji], index) => (
              <motion.button
                key={type}
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: index * 0.03, type: "spring", damping: 20, stiffness: 400 }}
                whileHover={{ scale: 1.3, y: -4 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onToggleReaction(messageId, type as ReactionType);
                  setShowPicker(false);
                }}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-muted rounded-full transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Quick reaction button to show picker
export const ReactionTrigger = ({
  onLongPress,
  onQuickReact,
}: {
  onLongPress: () => void;
  onQuickReact: (type: ReactionType) => void;
}) => {
  const [isPressed, setIsPressed] = useState(false);
  let pressTimer: NodeJS.Timeout;

  const handleMouseDown = () => {
    setIsPressed(true);
    pressTimer = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, 500);
  };

  const handleMouseUp = () => {
    if (isPressed) {
      clearTimeout(pressTimer);
      setIsPressed(false);
    }
  };

  return (
    <motion.button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      whileTap={{ scale: 0.9 }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
    >
      <span className="text-sm">❤️</span>
    </motion.button>
  );
};
