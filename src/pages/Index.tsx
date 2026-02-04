import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VideoCard } from "@/components/feed/VideoCard";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Bell, Search, RefreshCw, Sparkles, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

type FeedType = "forYou" | "following";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { posts, isLoading: feedLoading, likePost, loadMore, hasMore, refresh } = useFeed();
  const { unreadCount } = useNotifications();
  const [feedType, setFeedType] = useState<FeedType>("forYou");
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile && !profile.onboarding_completed) {
      navigate("/onboarding");
    }
  }, [user, profile, authLoading, navigate]);

  const fetchFollowingPosts = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingFollowing(true);
    
    try {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows || follows.length === 0) {
        setFollowingPosts([]);
        setIsLoadingFollowing(false);
        return;
      }

      const followingIds = follows.map(f => f.following_id);

      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          id,
          content_url,
          content_type,
          description,
          likes_count,
          comments_count,
          shares_count,
          saves_count,
          created_at,
          creator_id,
          profiles:creator_id (
            username,
            display_name,
            avatar_url,
            is_verified,
            verification_type
          )
        `)
        .in("creator_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching following posts:", error);
        setIsLoadingFollowing(false);
        return;
      }

      const postsWithLikes = await Promise.all(
        (postsData || []).map(async (post: any) => {
          const { data: like } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();

          return {
            ...post,
            creator_username: post.profiles?.username,
            creator_display_name: post.profiles?.display_name,
            creator_avatar_url: post.profiles?.avatar_url,
            creator_is_verified: post.profiles?.is_verified,
            creator_verification_type: post.profiles?.verification_type,
            is_liked: !!like,
          };
        })
      );

      setFollowingPosts(postsWithLikes);
    } catch (error) {
      console.error("Error in fetchFollowingPosts:", error);
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [user]);

  useEffect(() => {
    if (feedType === "following" && user) {
      fetchFollowingPosts();
    }
  }, [feedType, user, fetchFollowingPosts]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !feedLoading && feedType === "forYou") {
      loadMore();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (feedType === "forYou") {
      await refresh();
    } else {
      await fetchFollowingPosts();
    }
    setIsRefreshing(false);
  };

  const handleLikePost = async (postId: string) => {
    if (feedType === "forYou") {
      await likePost(postId);
    } else {
      setFollowingPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                is_liked: !post.is_liked,
                likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1,
              }
            : post
        )
      );

      const post = followingPosts.find(p => p.id === postId);
      if (post?.is_liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user?.id);
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user?.id,
        });
      }
    }
  };

  const handlePostDeleted = (postId: string) => {
    if (feedType === "following") {
      setFollowingPosts(prev => prev.filter(p => p.id !== postId));
    }
    refresh();
  };

  const currentPosts = feedType === "forYou" ? posts : followingPosts;
  const isCurrentLoading = feedType === "forYou" ? feedLoading : isLoadingFollowing;

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 safe-top">
        <div className="glass-strong px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">BRΞYK</span>
            </motion.div>
            
            <div className="flex items-center gap-1">
              {/* Feed Toggle */}
              <div className="flex bg-muted/50 rounded-full p-1 gap-0.5">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFeedType("forYou")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    feedType === "forYou" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Para Você</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFeedType("following")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    feedType === "following" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Seguindo</span>
                </motion.button>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/discover")}
                className="rounded-full w-9 h-9"
              >
                <Search className="w-5 h-5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/notifications")}
                className="relative rounded-full w-9 h-9"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold text-destructive-foreground"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 80 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-30 flex justify-center"
          >
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Atualizando...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Feed */}
      <div 
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        onScroll={handleScroll}
      >
        {isCurrentLoading && currentPosts.length === 0 ? (
          <div className="h-screen w-full flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando feed...</p>
          </div>
        ) : currentPosts.length === 0 ? (
          <div className="h-screen w-full flex flex-col items-center justify-center text-center px-8">
            {feedType === "following" ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                  <Users className="w-12 h-12 text-primary" />
                </div>
                <p className="text-2xl font-bold mb-2">Siga pessoas</p>
                <p className="text-muted-foreground mb-8 max-w-[280px]">
                  Posts de quem você segue aparecerão aqui
                </p>
                <Button 
                  onClick={() => navigate("/discover")}
                  className="rounded-full px-8 h-12"
                >
                  Descobrir Pessoas
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <p className="text-2xl font-bold mb-2">Nenhum post ainda</p>
                <p className="text-muted-foreground mb-8 max-w-[280px]">
                  Seja o primeiro a compartilhar algo incrível!
                </p>
                <Button 
                  onClick={() => navigate("/create")}
                  className="rounded-full px-8 h-12"
                >
                  Criar Post
                </Button>
              </motion.div>
            )}
          </div>
        ) : (
          currentPosts.map((post) => (
            <VideoCard
              key={post.id}
              id={post.id}
              creatorId={post.creator_id}
              username={post.creator_username || "unknown"}
              displayName={post.creator_display_name || "Usuário"}
              avatar={post.creator_avatar_url || ""}
              description={post.description || ""}
              likes={post.likes_count}
              comments={post.comments_count}
              shares={post.shares_count}
              isVerified={post.creator_is_verified}
              verificationBadge={post.creator_verification_type === "gold" ? "gold" : post.creator_verification_type === "staff" ? "staff" : "blue"}
              thumbnailUrl={post.content_url || ""}
              isLiked={post.is_liked}
              onLike={() => handleLikePost(post.id)}
              onDeleted={() => handlePostDeleted(post.id)}
            />
          ))
        )}
        
        {feedLoading && posts.length > 0 && feedType === "forYou" && (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
