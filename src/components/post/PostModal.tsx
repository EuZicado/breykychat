import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, BadgeCheck, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useComments } from "@/hooks/useComments";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostModalProps {
  post: {
    id: string;
    content_url: string | null;
    content_type: string;
    description: string | null;
    likes_count: number;
    comments_count: number;
    created_at: string;
    creator: {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      is_verified: boolean;
      verification_type: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
}

export const PostModal = ({ post, isOpen, onClose }: PostModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { comments, isLoading: commentsLoading, addComment } = useComments(post.id);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !post.id) return;

    const checkStatus = async () => {
      const [likeResult, saveResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("saved_posts")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .single()
      ]);

      setIsLiked(!!likeResult.data);
      setIsSaved(!!saveResult.data);
    };

    checkStatus();
  }, [user, post.id]);

  const handleLike = async () => {
    if (!user) return;

    if (isLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      
      setLikesCount(prev => prev - 1);
    } else {
      await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: user.id });
      
      setLikesCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
  };

  const handleSave = async () => {
    if (!user) return;

    if (isSaved) {
      await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("saved_posts")
        .insert({ post_id: post.id, user_id: user.id });
    }
    setIsSaved(!isSaved);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    await addComment(commentText.trim());
    setCommentText("");
    setIsSubmitting(false);
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "gold": return "text-warning";
      case "staff": return "text-accent";
      default: return "text-blue-500";
    }
  };

  const goToProfile = () => {
    onClose();
    navigate(`/user/${post.creator.id}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-background rounded-2xl overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image/Content */}
            <div className="w-full md:w-1/2 bg-black flex items-center justify-center">
              {post.content_url && (
                post.content_type === "video" ? (
                  <video
                    src={post.content_url}
                    className="w-full h-full object-contain max-h-[50vh] md:max-h-[90vh]"
                    controls
                  />
                ) : (
                  <img
                    src={post.content_url}
                    alt=""
                    className="w-full h-full object-contain max-h-[50vh] md:max-h-[90vh]"
                  />
                )
              )}
            </div>

            {/* Details */}
            <div className="w-full md:w-1/2 flex flex-col max-h-[40vh] md:max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <button onClick={goToProfile}>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.creator.avatar_url || ""} />
                    <AvatarFallback>
                      {post.creator.display_name?.[0] || post.creator.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1">
                  <button onClick={goToProfile} className="flex items-center gap-1">
                    <span className="font-semibold text-sm">
                      {post.creator.display_name || post.creator.username}
                    </span>
                    {post.creator.is_verified && (
                      <BadgeCheck className={cn("w-4 h-4", getBadgeColor(post.creator.verification_type))} />
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <button className="p-2">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Comments area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Post description */}
                {post.description && (
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={post.creator.avatar_url || ""} />
                      <AvatarFallback>
                        {post.creator.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold mr-1">
                          {post.creator.username}
                        </span>
                        {post.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Nenhum comentário ainda
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.user?.avatar_url || ""} />
                        <AvatarFallback>
                          {comment.user?.display_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold mr-1">
                            {comment.user?.username}
                          </span>
                          {comment.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={handleLike} className="tap-highlight-none">
                      <Heart className={cn("w-6 h-6", isLiked && "fill-red-500 text-red-500")} />
                    </button>
                    <button className="tap-highlight-none">
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    <button className="tap-highlight-none">
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                  <button onClick={handleSave} className="tap-highlight-none">
                    <Bookmark className={cn("w-6 h-6", isSaved && "fill-foreground")} />
                  </button>
                </div>

                <p className="font-semibold text-sm">{likesCount} curtidas</p>

                {/* Comment input */}
                <div className="flex items-center gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Adicione um comentário..."
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
                    onKeyPress={(e) => e.key === "Enter" && handleSubmitComment()}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || isSubmitting}
                    className="text-primary font-semibold"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
