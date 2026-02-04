import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoidBubbleProps {
  id: string;
  content: string;
  username: string;
  avatar: string;
  expiresIn: string;
  type: "text" | "image" | "video";
  index: number;
}

export const VoidBubble = ({
  content,
  username,
  avatar,
  expiresIn,
  type,
  index,
}: VoidBubbleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
      }}
      transition={{ 
        delay: index * 0.1,
        type: "spring",
        stiffness: 260,
        damping: 20 
      }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-pointer tap-highlight-none",
        type === "text" ? "p-4 glass neon-border" : "aspect-[3/4]"
      )}
    >
      {type === "text" ? (
        <div className="space-y-3">
          <p className="text-foreground text-sm leading-relaxed">{content}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={avatar}
                alt={username}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs text-muted-foreground">@{username}</span>
            </div>
            <span className="text-xs text-primary/70">{expiresIn}</span>
          </div>
        </div>
      ) : (
        <>
          <img
            src={content}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={avatar}
                  alt={username}
                  className="w-6 h-6 rounded-full object-cover border border-white/20"
                />
                <span className="text-xs text-foreground/90">@{username}</span>
              </div>
              <span className="text-xs text-primary/70 glass px-2 py-1 rounded-full">
                {expiresIn}
              </span>
            </div>
          </div>
        </>
      )}
      
      {/* Glow Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-radial from-primary/20 via-transparent to-transparent" />
    </motion.div>
  );
};
