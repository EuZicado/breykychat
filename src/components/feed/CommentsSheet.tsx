import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, Send, Loader2, BadgeCheck, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const CommentsSheet = ({ isOpen, onClose, postId }: CommentsSheetProps) => {
  const { user, profile } = useAuth();
  const { comments, isLoading, addComment, likeComment, deleteComment } = useComments(postId);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await addComment(newComment.trim());
    setNewComment("");
    setIsSubmitting(false);
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "gold":
        return "text-warning";
      case "staff":
        return "text-accent";
      default:
        return "text-blue-500";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="border-b border-white/10 pb-4">
          <SheetTitle className="text-center">
            Comentários ({comments.length})
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(80vh-140px)] py-4">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground mb-2">Nenhum comentário ainda</p>
                <p className="text-sm text-muted-foreground">
                  Seja o primeiro a comentar!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-3"
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.user?.avatar_url || ""} />
                      <AvatarFallback>
                        {comment.user?.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-semibold text-sm">
                          {comment.user?.display_name || comment.user?.username || "Usuário"}
                        </span>
                        {comment.user?.is_verified && (
                          <BadgeCheck 
                            className={cn("w-3.5 h-3.5", getBadgeColor(comment.user?.verification_type || "blue"))} 
                          />
                        )}
                        <span className="text-xs text-muted-foreground">
                          · {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: false,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => likeComment(comment.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Heart 
                            className={cn(
                              "w-4 h-4",
                              comment.is_liked && "fill-destructive text-destructive"
                            )} 
                          />
                          {comment.likes_count > 0 && comment.likes_count}
                        </button>
                        
                        {user?.id === comment.user_id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => deleteComment(comment.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-3 pl-4 border-l border-white/10">
                          {comment.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-2">
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarImage src={reply.user?.avatar_url || ""} />
                                <AvatarFallback className="text-xs">
                                  {reply.user?.display_name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-xs">
                                    {reply.user?.display_name || "Usuário"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    · {formatDistanceToNow(new Date(reply.created_at), {
                                      addSuffix: false,
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Comment Input */}
        {user && (
          <form onSubmit={handleSubmit} className="absolute bottom-0 left-0 right-0 p-4 glass-strong border-t border-white/10 safe-bottom">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback>
                  {profile?.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 text-primary" />
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};