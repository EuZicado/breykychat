import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, BadgeCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommentsSheet } from "./CommentsSheet";
import { PostOptionsSheet } from "./PostOptionsSheet";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface VideoCardProps {
  id: string;
  creatorId: string;
  username: string;
  displayName: string;
  avatar: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  isVerified?: boolean;
  verificationBadge?: "blue" | "gold" | "staff";
  videoUrl?: string;
  thumbnailUrl: string;
  isLiked?: boolean;
  isPrivate?: boolean;
  onLike?: () => void;
  onDeleted?: () => void;
}

export const VideoCard = ({
  id,
  creatorId,
  username,
  displayName,
  avatar,
  description,
  likes,
  comments,
  shares,
  isVerified,
  verificationBadge = "blue",
  thumbnailUrl,
  isLiked: externalIsLiked,
  isPrivate = false,
  onLike,
  onDeleted,
}: VideoCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, toggleFollow, isLoading: followLoading } = useFollow(creatorId);
  const { isPostSaved, toggleSavePost } = useSavedPosts();
  
  const [isLiked, setIsLiked] = useState(externalIsLiked ?? false);
  const [showHeart, setShowHeart] = useState(false);
  const [localLikes, setLocalLikes] = useState(likes);
  const [localComments, setLocalComments] = useState(comments);
  const [localShares, setLocalShares] = useState(shares);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [localIsPrivate, setLocalIsPrivate] = useState(isPrivate);

  const isSaved = isPostSaved(id);
  const isOwnPost = user?.id === creatorId;

  useEffect(() => {
    setIsLiked(externalIsLiked ?? false);
  }, [externalIsLiked]);

  useEffect(() => {
    setLocalLikes(likes);
  }, [likes]);

  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 600);
    
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  const handleLike = () => {
    if (!user) {
      toast.error("Faça login para curtir");
      return;
    }
    
    if (onLike) {
      onLike();
    }
    setIsLiked(!isLiked);
    setLocalLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleComment = () => {
    if (!user) {
      toast.error("Faça login para comentar");
      return;
    }
    setCommentsOpen(true);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post de @${username}`,
          text: description || "Confira este post no BRΞYK!",
          url: shareUrl,
        });
        setLocalShares((prev) => prev + 1);
        toast.success("Post compartilhado!");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await copyToClipboard(shareUrl);
        }
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Faça login para salvar");
      return;
    }
    
    await toggleSavePost(id);
    
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Faça login para seguir");
      return;
    }
    
    await toggleFollow();
    toast.success(isFollowing ? "Deixou de seguir" : "Seguindo!");
  };

  const handleOpenProfile = () => {
    if (isOwnPost) {
      navigate("/profile");
    } else {
      navigate(`/user/${creatorId}`);
    }
  };

  const handleOpenOptions = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    setOptionsOpen(true);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getBadgeColor = () => {
    switch (verificationBadge) {
      case "gold":
        return "text-warning";
      case "staff":
        return "text-accent";
      default:
        return "text-blue-500";
    }
  };

  return (
    <>
      <div className="relative h-screen w-full snap-start snap-always">
        {/* Video/Image Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
          onDoubleClick={handleDoubleTap}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-transparent" />
        </div>

        {/* Private Badge */}
        {localIsPrivate && isOwnPost && (
          <div className="absolute top-20 left-4 flex items-center gap-2 bg-muted/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Privado</span>
          </div>
        )}

        {/* Heart Animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-32 h-32 text-destructive fill-destructive" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Overlay */}
        <div className="absolute bottom-24 left-0 right-0 px-4">
          <div className="flex items-end justify-between gap-4">
            {/* Left Side - User Info & Description */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={handleOpenProfile} className="tap-highlight-none">
                  <img
                    src={avatar || "/placeholder.svg"}
                    alt={displayName}
                    className="w-10 h-10 rounded-full border-2 border-primary object-cover"
                  />
                </button>
                <button onClick={handleOpenProfile} className="tap-highlight-none text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">{displayName}</span>
                    {isVerified && (
                      <BadgeCheck className={cn("w-4 h-4", getBadgeColor())} />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">@{username}</span>
                </button>
                {!isOwnPost && (
                  <Button 
                    variant={isFollowing ? "outline" : "neon"} 
                    size="sm" 
                    className="ml-2"
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {isFollowing ? "Seguindo" : "Seguir"}
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground/90 line-clamp-2">{description}</p>
            </div>

            {/* Right Side - Actions */}
            <div className="flex flex-col items-center gap-5">
              <ActionButton
                icon={Heart}
                label={formatNumber(localLikes)}
                isActive={isLiked}
                activeColor="text-destructive"
                onClick={handleLike}
                filled={isLiked}
              />
              <ActionButton
                icon={MessageCircle}
                label={formatNumber(localComments)}
                onClick={handleComment}
              />
              <ActionButton
                icon={Share2}
                label={formatNumber(localShares)}
                onClick={handleShare}
              />
              <ActionButton
                icon={Bookmark}
                label={isSaved ? "Salvo" : "Salvar"}
                isActive={isSaved}
                activeColor="text-warning"
                onClick={handleSave}
                filled={isSaved}
              />
              <ActionButton
                icon={MoreHorizontal}
                onClick={handleOpenOptions}
              />
            </div>
          </div>
        </div>
      </div>

      <CommentsSheet
        postId={id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />

      <PostOptionsSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        postId={id}
        creatorId={creatorId}
        isPrivate={localIsPrivate}
        onPostDeleted={onDeleted}
        onPrivacyChanged={() => setLocalIsPrivate(!localIsPrivate)}
      />
    </>
  );
};

interface ActionButtonProps {
  icon: React.ElementType;
  label?: string;
  isActive?: boolean;
  activeColor?: string;
  onClick: () => void;
  filled?: boolean;
}

const ActionButton = ({
  icon: Icon,
  label,
  isActive,
  activeColor = "text-primary",
  onClick,
  filled,
}: ActionButtonProps) => {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 tap-highlight-none"
    >
      <div
        className={cn(
          "w-12 h-12 rounded-full glass flex items-center justify-center transition-colors",
          isActive && activeColor
        )}
      >
        <Icon
          className={cn("w-6 h-6", filled && "fill-current")}
        />
      </div>
      {label && (
        <span className="text-xs text-foreground/80">{label}</span>
      )}
    </motion.button>
  );
};
