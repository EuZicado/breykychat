import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VideoCard } from "@/components/feed/VideoCard"; // Certifique-se que VideoCard aceita a prop 'isActive'
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Bell, Search, RefreshCw, Sparkles, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

// Tipagem correta para evitar 'any'
interface Post {
  id: string;
  content_url: string;
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
  creator_verification_type?: string;
  is_liked?: boolean;
}

type FeedType = "forYou" | "following";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { posts: forYouPosts, isLoading: feedLoading, likePost, loadMore, hasMore, refresh } = useFeed();
  const { unreadCount } = useNotifications();
  
  const [feedType, setFeedType] = useState<FeedType>("forYou");
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Controle de qual vídeo está visível para autoplay
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Auth Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/auth");
      else if (profile && !profile.onboarding_completed) navigate("/onboarding");
    }
  }, [user, profile, authLoading, navigate]);

  // --- OTIMIZAÇÃO: Fetch Following Posts (Batch Request) ---
  const fetchFollowingPosts = useCallback(async () => {
    if (!user) return;
    setIsLoadingFollowing(true);
    
    try {
      // 1. Pegar quem o usuário segue
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

      // 2. Pegar os posts dessas pessoas
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

      if (error || !postsData) throw error;

      // 3. OTIMIZAÇÃO: Pegar likes em LOTE (Batch) ao invés de um por um
      const postIds = postsData.map(p => p.id);
      const { data: myLikes } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds)
        .eq("user_id", user.id);

      const likedPostIds = new Set(myLikes?.map(l => l.post_id));

      // 4. Montar objeto final
      const formattedPosts: Post[] = postsData.map((post: any) => ({
        ...post,
        creator_username: post.profiles?.username,
        creator_display_name: post.profiles?.display_name,
        creator_avatar_url: post.profiles?.avatar_url,
        creator_is_verified: post.profiles?.is_verified,
        creator_verification_type: post.profiles?.verification_type,
        is_liked: likedPostIds.has(post.id),
      }));

      setFollowingPosts(formattedPosts);
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [user]);

  useEffect(() => {
    if (feedType === "following") fetchFollowingPosts();
  }, [feedType, fetchFollowingPosts]);

  // --- Lógica de Scroll e Autoplay (Intersection Observer) ---
  const setupObserver = useCallback(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.6, // O vídeo precisa estar 60% visível para ser considerado "ativo"
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("data-post-id");
          if (id) setActivePostId(id);
        }
      });
    }, options);

    // Observar todos os elementos de vídeo
    const videoElements = document.querySelectorAll(".video-container");
    videoElements.forEach((el) => observerRef.current?.observe(el));
  }, []);

  // Reiniciar observer quando a lista de posts mudar
  const currentPosts = feedType === "forYou" ? forYouPosts : followingPosts;
  
  useEffect(() => {
    // Pequeno delay para garantir que o DOM renderizou
    const timeout = setTimeout(setupObserver, 500);
    return () => {
      clearTimeout(timeout);
      observerRef.current?.disconnect();
    };
  }, [currentPosts, feedType, setupObserver]);

  // Handle Refresh manual
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (feedType === "forYou") await refresh();
    else await fetchFollowingPosts();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Like Otimista
  const handleLikePost = async (postId: string) => {
    // Atualiza estado local imediatamente (Optimistic UI)
    const updateLocalState = (prev: Post[]) => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: !p.is_liked, likes_count: (p.is_liked ? p.likes_count - 1 : p.likes_count + 1) }
        : p
    );

    if (feedType === "forYou") {
      // Assumindo que likePost do useFeed já lida com o banco
      await likePost(postId); 
    } else {
      setFollowingPosts(updateLocalState);
      // Lógica de banco para Following
      const post = followingPosts.find(p => p.id === postId);
      const isNowLiked = !post?.is_liked; // Inverte o estado atual para saber a ação
      
      if (isNowLiked) {
         await supabase.from("post_likes").insert({ post_id: postId, user_id: user?.id });
      } else {
         await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user?.id);
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 2 && hasMore && !feedLoading && feedType === "forYou") {
      loadMore();
    }
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <AppLayout hideHeader> {/* Presumindo que você possa esconder o header padrão do AppLayout */}
      <div className="relative h-[100dvh] w-full bg-black text-white overflow-hidden">
        
        {/* Floating Header (Immersive) */}
        <header className="absolute top-0 left-0 right-0 z-50 pt-safe-top">
          <div className="w-full bg-gradient-to-b from-black/60 to-transparent px-4 pb-12 pt-4">
            <div className="flex items-center justify-between">
              {/* Logo / Brand */}
              <div className="flex items-center gap-2 opacity-90">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>

              {/* Central Tabs */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                <TabButton 
                  active={feedType === "following"} 
                  onClick={() => setFeedType("following")}
                  label="Seguindo" 
                />
                <div className="w-[1px] h-3 bg-white/20" />
                <TabButton 
                  active={feedType === "forYou"} 
                  onClick={() => setFeedType("forYou")}
                  label="Para Você" 
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate("/discover")} className="text-white hover:bg-white/10 rounded-full w-10 h-10">
                  <Search className="w-6 h-6" />
                </Button>
                <div className="relative">
                   <Button variant="ghost" size="icon" onClick={() => navigate("/notifications")} className="text-white hover:bg-white/10 rounded-full w-10 h-10">
                    <Bell className="w-6 h-6" />
                  </Button>
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Refresh Indicator */}
        <AnimatePresence>
          {isRefreshing && (
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 60 }}
              exit={{ opacity: 0, y: 0 }}
              className="absolute top-0 left-0 right-0 z-40 flex justify-center pt-safe-top"
            >
              <div className="bg-primary/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg text-xs font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Feed Container */}
        <div 
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
          onScroll={handleScroll}
        >
          {/* Loading State */}
          {(feedType === "forYou" ? feedLoading : isLoadingFollowing) && currentPosts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : currentPosts.length === 0 ? (
            <EmptyFeedState type={feedType} navigate={navigate} onRefresh={handleRefresh} />
          ) : (
            currentPosts.map((post) => (
              // Wrapper do snap para garantir o comportamento correto
              <div 
                key={post.id} 
                className="h-[100dvh] w-full snap-start relative video-container"
                data-post-id={post.id}
              >
                <VideoCard
                  id={post.id}
                  {...post} // Espalha as propriedades do post
                  username={post.creator_username || "user"}
                  displayName={post.creator_display_name || "Usuário"}
                  avatar={post.creator_avatar_url || ""}
                  thumbnailUrl={post.content_url} // Ajuste conforme seu VideoCard espera
                  isLiked={post.is_liked}
                  onLike={() => handleLikePost(post.id)}
                  onDeleted={() => refresh()} // Simplificado
                  // IMPORTANTE: Passar se está ativo para o vídeo tocar
                  isActive={post.id === activePostId} 
                />
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

// --- Subcomponentes para Limpeza ---

const TabButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button onClick={onClick} className="relative py-2 px-1">
    <span className={`text-base font-bold transition-colors duration-200 ${active ? "text-white" : "text-white/60 hover:text-white/80"}`}>
      {label}
    </span>
    {active && (
      <motion.div layoutId="activeTab" className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
    )}
  </button>
);

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-black">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const EmptyFeedState = ({ type, navigate, onRefresh }: { type: FeedType, navigate: any, onRefresh: () => void }) => (
  <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 text-white">
    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm">
      {type === "following" ? <Users className="w-10 h-10 text-white/80" /> : <Sparkles className="w-10 h-10 text-white/80" />}
    </div>
    <h3 className="text-xl font-bold mb-2">
      {type === "following" ? "Siga criadores" : "Comece a explorar"}
    </h3>
    <p className="text-white/50 mb-8 max-w-[250px] text-sm">
      {type === "following" ? "Posts de quem você segue aparecerão aqui." : "Assista aos vídeos mais populares da plataforma."}
    </p>
    <div className="flex flex-col gap-3 w-full max-w-xs">
      <Button onClick={type === "following" ? () => navigate("/discover") : onRefresh} className="rounded-full w-full font-semibold" size="lg">
        {type === "following" ? "Encontrar Pessoas" : "Atualizar Feed"}
      </Button>
    </div>
  </div>
);

export default Index;
