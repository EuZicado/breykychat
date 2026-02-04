import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VideoCard } from "@/components/feed/VideoCard";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Bell, Search, RefreshCw, Users, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface FeedPost {
  id: string;
  content_url: string | null;
  content_type: string;
  description: string | null;
  likes_count: number;
  comments_count: number | null;
  shares_count: number | null;
  saves_count: number | null;
  created_at: string;
  creator_id: string;
  creator_username?: string;
  creator_display_name?: string;
  creator_avatar_url?: string;
  creator_is_verified?: boolean;
  creator_verification_type?: "blue" | "gold" | "staff" | "none";
  is_liked?: boolean;
}

type FeedType = "forYou" | "following";

const Index = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { user, profile, isLoading: authLoading } = useAuth();
  const { posts: forYouPosts, isLoading: feedLoading, likePost, loadMore, hasMore, refresh } = useFeed();
  const { unreadCount } = useNotifications();
  
  const [feedType, setFeedType] = useState<FeedType>("forYou");
  const [followingPosts, setFollowingPosts] = useState<FeedPost[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile && !profile.onboarding_completed) {
      navigate("/onboarding");
    }
  }, [user, profile, authLoading, navigate]);

  // Fetch Following Posts
  const fetchFollowingPosts = useCallback(async () => {
    if (!user) return;
    setIsLoadingFollowing(true);
    
    try {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows?.length) {
        setFollowingPosts([]);
        return;
      }

      const followingIds = follows.map(f => f.following_id);

      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:creator_id (
            username, display_name, avatar_url, is_verified, verification_type
          )
        `)
        .in("creator_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      if (postsData) {
        const { data: userLikes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postsData.map(p => p.id));

        const likedPostIds = new Set(userLikes?.map(l => l.post_id));

        const formattedPosts: FeedPost[] = postsData.map((post: any) => ({
          ...post,
          creator_username: post.profiles?.username,
          creator_display_name: post.profiles?.display_name,
          creator_avatar_url: post.profiles?.avatar_url,
          creator_is_verified: post.profiles?.is_verified,
          creator_verification_type: post.profiles?.verification_type,
          is_liked: likedPostIds.has(post.id),
        }));

        setFollowingPosts(formattedPosts);
      }
    } catch (error) {
      console.error("Error fetching following posts:", error);
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [user]);

  useEffect(() => {
    if (feedType === "following" && user && followingPosts.length === 0) {
      fetchFollowingPosts();
    }
  }, [feedType, user, fetchFollowingPosts, followingPosts.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 2 && hasMore && !feedLoading && feedType === "forYou") {
      loadMore();
    }
  };

  const handleSwitchFeed = (type: FeedType) => {
    if (feedType === type && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setFeedType(type);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (feedType === "forYou") {
      await likePost(postId);
    } else {
      setFollowingPosts(prev => prev.map(post => {
        if (post.id !== postId) return post;
        const isLiked = !post.is_liked;
        return {
          ...post,
          is_liked: isLiked,
          likes_count: isLiked ? post.likes_count + 1 : post.likes_count - 1
        };
      }));

      const post = followingPosts.find(p => p.id === postId);
      if (post?.is_liked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user?.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user?.id });
      }
    }
  };

  const currentPosts = feedType === "forYou" ? forYouPosts : followingPosts;
  const isCurrentLoading = feedType === "forYou" ? feedLoading : isLoadingFollowing;

  if (authLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Container principal agora usa bg-background (branco/escuro dependendo do tema) */}
      <div className="relative h-[100dvh] w-full bg-background overflow-hidden flex flex-col">
        
        {/* --- Header Transparente com Glassmorphism --- */}
        <header className="absolute top-0 left-0 right-0 z-50 pt-safe-top">
          {/* Fundo suave em vez de preto total */}
          <div className="absolute inset-0 h-24 bg-gradient-to-b from-background/90 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-between px-4 py-3">
            {/* Logo/Icon Left */}
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                 <TrendingUp className="w-5 h-5 text-primary" />
               </div>
            </div>

            {/* Central Tabs */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleSwitchFeed("following")}
                className={cn(
                  "text-base font-bold transition-all duration-200",
                  feedType === "following" 
                    ? "text-foreground scale-105" 
                    : "text-muted-foreground hover:text-foreground/80 scale-100"
                )}
              >
                Seguindo
                {feedType === "following" && (
                  <motion.div layoutId="tab-indicator" className="h-[3px] w-6 bg-primary rounded-full mx-auto mt-1" />
                )}
              </button>
              <div className="w-[1px] h-4 bg-border" />
              <button
                onClick={() => handleSwitchFeed("forYou")}
                className={cn(
                  "text-base font-bold transition-all duration-200",
                  feedType === "forYou" 
                    ? "text-foreground scale-105" 
                    : "text-muted-foreground hover:text-foreground/80 scale-100"
                )}
              >
                Para Você
                {feedType === "forYou" && (
                  <motion.div layoutId="tab-indicator" className="h-[3px] w-6 bg-primary rounded-full mx-auto mt-1" />
                )}
              </button>
            </div>

            {/* Search (Right) */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/discover")}
              className="text-foreground hover:bg-muted rounded-full w-10 h-10"
            >
              <Search className="w-6 h-6 stroke-[2.5]" />
            </Button>
          </div>
        </header>

        {/* --- Refresh Indicator --- */}
        <AnimatePresence>
          {isRefreshing && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 100 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
            >
              <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs font-bold">Atualizando...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Video Scroll Container --- */}
        <div 
          ref={containerRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth hide-scrollbar bg-background"
          onScroll={handleScroll}
        >
          {isCurrentLoading && currentPosts.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm font-medium">Carregando feed...</p>
            </div>
          ) : currentPosts.length === 0 ? (
            // Empty States
            <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 z-10 relative">
              {feedType === "following" ? (
                <EmptyStateFollowing navigate={navigate} />
              ) : (
                <EmptyStateForYou navigate={navigate} />
              )}
            </div>
          ) : (
            // Feed List
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
                comments={post.comments_count || 0}
                shares={post.shares_count || 0}
                isVerified={post.creator_is_verified || false}
                verificationBadge={post.creator_verification_type || "none"}
                thumbnailUrl={post.content_url || ""}
                isLiked={post.is_liked || false}
                onLike={() => handleLikePost(post.id)}
                onDeleted={() => refresh()}
              />
            ))
          )}
          
          {/* Bottom Loader */}
          {feedLoading && posts && posts.length > 0 && (
             <div className="h-20 w-full flex items-center justify-center snap-align-none">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
             </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

// --- Subcomponentes de Empty State (Cores corrigidas) ---

const EmptyStateFollowing = ({ navigate }: { navigate: any }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
      <Users className="w-10 h-10 text-muted-foreground" />
    </div>
    <h2 className="text-2xl font-bold text-foreground mb-2">Siga criadores</h2>
    <p className="text-muted-foreground mb-8 max-w-[260px]">
      Os vídeos das pessoas que você seguir aparecerão aqui.
    </p>
    <Button 
      onClick={() => navigate("/discover")}
      className="rounded-full px-8 h-12 font-semibold"
    >
      Encontrar Pessoas
    </Button>
  </motion.div>
);

const EmptyStateForYou = ({ navigate }: { navigate: any }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
      <Sparkles className="w-10 h-10 text-muted-foreground" />
    </div>
    <h2 className="text-2xl font-bold text-foreground mb-2">Feed vazio</h2>
    <p className="text-muted-foreground mb-8 max-w-[260px]">
      Seja o primeiro a publicar algo incrível hoje!
    </p>
    <Button 
      onClick={() => navigate("/create")}
      className="rounded-full px-8 h-12 font-semibold"
    >
      Criar Agora
    </Button>
  </motion.div>
);

export default Index;
