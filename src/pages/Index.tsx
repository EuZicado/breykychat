import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VideoCard } from "@/components/feed/VideoCard";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Bell, Search, RefreshCw, Users, Sparkles } from "lucide-react";
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
      // 1. Get IDs of followed users
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows?.length) {
        setFollowingPosts([]);
        return;
      }

      const followingIds = follows.map(f => f.following_id);

      // 2. Fetch Posts
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

      // 3. Check Likes status efficiently
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

  // Initial Load for Following
  useEffect(() => {
    if (feedType === "following" && user && followingPosts.length === 0) {
      fetchFollowingPosts();
    }
  }, [feedType, user, fetchFollowingPosts, followingPosts.length]);

  // Handle Scroll (Infinite Loading)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Load more when 2 screens away from bottom
    if (scrollHeight - scrollTop <= clientHeight * 2 && hasMore && !feedLoading && feedType === "forYou") {
      loadMore();
    }
  };

  // Switch Feed Handler (Scrolls to top)
  const handleSwitchFeed = (type: FeedType) => {
    if (feedType === type && containerRef.current) {
      // Se clicar na aba atual, scrolla para o topo (refresh behavior)
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setFeedType(type);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (feedType === "forYou") {
      await likePost(postId);
    } else {
      // Otimistic UI Update for Following Tab
      setFollowingPosts(prev => prev.map(post => {
        if (post.id !== postId) return post;
        const isLiked = !post.is_liked;
        return {
          ...post,
          is_liked: isLiked,
          likes_count: isLiked ? post.likes_count + 1 : post.likes_count - 1
        };
      }));

      // Server Update
      const post = followingPosts.find(p => p.id === postId);
      if (post?.is_liked) { // Was liked, now unliking
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user?.id);
      } else { // Was unliked, now liking
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user?.id });
      }
    }
  };

  const currentPosts = feedType === "forYou" ? forYouPosts : followingPosts;
  const isCurrentLoading = feedType === "forYou" ? feedLoading : isLoadingFollowing;

  // Loading Screen (Full)
  if (authLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
        
        {/* --- Immersive Header --- */}
        <header className="absolute top-0 left-0 right-0 z-50 pt-safe-top">
          {/* Gradient gradient for readability */}
          <div className="absolute inset-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-between px-4 py-3">
            {/* Live / Brand Icon (Left) */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/live")}
              className="text-white hover:bg-white/10 rounded-full w-10 h-10"
            >
               <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                 <Sparkles className="w-4 h-4 text-white" />
               </div>
            </Button>

            {/* Central Tabs */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleSwitchFeed("following")}
                className={cn(
                  "text-base font-bold transition-all duration-200 drop-shadow-md",
                  feedType === "following" 
                    ? "text-white scale-105" 
                    : "text-white/60 hover:text-white/80 scale-100"
                )}
              >
                Seguindo
                {feedType === "following" && (
                  <motion.div layoutId="tab-indicator" className="h-[3px] w-6 bg-primary rounded-full mx-auto mt-1" />
                )}
              </button>
              <div className="w-[1px] h-4 bg-white/20" />
              <button
                onClick={() => handleSwitchFeed("forYou")}
                className={cn(
                  "text-base font-bold transition-all duration-200 drop-shadow-md",
                  feedType === "forYou" 
                    ? "text-white scale-105" 
                    : "text-white/60 hover:text-white/80 scale-100"
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
              className="text-white hover:bg-white/10 rounded-full w-10 h-10"
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
              animate={{ opacity: 1, y: 120 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
            >
              <div className="bg-primary/90 backdrop-blur text-primary-foreground px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-white/10">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs font-bold">Atualizando...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Video Scroll Container --- */}
        <div 
          ref={containerRef}
          className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth hide-scrollbar bg-black"
          onScroll={handleScroll}
        >
          {isCurrentLoading && currentPosts.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-white/50 text-sm font-medium animate-pulse">Carregando feed...</p>
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
             <div className="h-10 w-full flex items-center justify-center absolute bottom-4 pointer-events-none">
                <Loader2 className="w-5 h-5 animate-spin text-white/50" />
             </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

// --- Subcomponentes de Empty State ---

const EmptyStateFollowing = ({ navigate }: { navigate: any }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
    <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6 backdrop-blur-sm">
      <Users className="w-10 h-10 text-white/80" />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">Siga criadores</h2>
    <p className="text-white/60 mb-8 max-w-[260px]">
      Os vídeos das pessoas que você seguir aparecerão aqui.
    </p>
    <Button 
      onClick={() => navigate("/discover")}
      className="rounded-full px-8 h-12 font-semibold bg-primary hover:bg-primary/90 text-white border-0"
    >
      Encontrar Pessoas
    </Button>
  </motion.div>
);

const EmptyStateForYou = ({ navigate }: { navigate: any }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
    <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6 backdrop-blur-sm">
      <Sparkles className="w-10 h-10 text-white/80" />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">Feed vazio</h2>
    <p className="text-white/60 mb-8 max-w-[260px]">
      Seja o primeiro a publicar algo incrível hoje!
    </p>
    <Button 
      onClick={() => navigate("/create")}
      className="rounded-full px-8 h-12 font-semibold bg-white text-black hover:bg-white/90"
    >
      Criar Agora
    </Button>
  </motion.div>
);

export default Index;
