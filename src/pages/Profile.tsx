import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Play, 
  Grid3X3, 
  Heart, 
  Bookmark, 
  TrendingUp,
  MessageCircle,
  BarChart3,
  Layers,
  Video,
  Image as ImageIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton"; // Certifique-se de ter este componente ou use div simples

// --- Interfaces ---
interface Post {
  id: string;
  content_url: string | null;
  content_type: "video" | "image" | "text";
  description: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number | null;
  shares_count: number | null;
  saves_count: number | null;
}

interface ProfileStats {
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  avgEngagement: number;
}

// --- Componente Principal ---
const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { savedPosts, isLoading: savedLoading } = useSavedPosts();

  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "liked">("posts");

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Fetch Own Posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("posts")
        .select("*") // Simplificado para * ou selecione os campos específicos
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) setPosts(data || []);
      setIsLoadingPosts(false);
    };

    if (user) fetchUserPosts();
  }, [user]);

  // Fetch Liked Posts
  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (!user || activeTab !== "liked") return;
      setIsLoadingLiked(true);

      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!likes?.length) {
        setLikedPosts([]);
        setIsLoadingLiked(false);
        return;
      }

      const postIds = likes.map((l) => l.post_id);
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .in("id", postIds);

      setLikedPosts(postsData || []);
      setIsLoadingLiked(false);
    };

    fetchLikedPosts();
  }, [user, activeTab]);

  // Stats Memo
  const profileStats: ProfileStats = useMemo(() => {
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const totalSaves = posts.reduce((sum, p) => sum + (p.saves_count || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
    
    const avgEngagement = posts.length > 0 
      ? Math.round((totalLikes + totalComments + totalSaves + totalShares) / posts.length) 
      : 0;

    return { totalLikes, totalComments, totalSaves, avgEngagement };
  }, [posts]);

  // Helpers
  const getCurrentPosts = (): Post[] => {
    if (activeTab === "saved") {
      return savedPosts.filter(sp => sp.post).map(sp => ({
        ...sp.post!,
        created_at: sp.created_at, // Use saved date or post date based on preference
        comments_count: 0, // Ajuste conforme sua query de savedPosts
        shares_count: 0,
        saves_count: 0
      } as Post));
    }
    return activeTab === "liked" ? likedPosts : posts;
  };

  const isCurrentLoading = () => {
    if (activeTab === "saved") return savedLoading;
    if (activeTab === "liked") return isLoadingLiked;
    return isLoadingPosts;
  };

  const getEmptyState = () => {
    const states = {
      saved: { icon: Bookmark, title: "Salvos", sub: "Posts que você salvou." },
      liked: { icon: Heart, title: "Curtidas", sub: "Posts que você curtiu." },
      posts: { icon: Grid3X3, title: "Publicações", sub: "Compartilhe seus momentos." }
    };
    return states[activeTab];
  };

  if (authLoading || !profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const currentPosts = getCurrentPosts();
  const loading = isCurrentLoading();
  const emptyState = getEmptyState();

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-20">
        <ProfileHeader
          userId={user?.id}
          username={profile.username || "usuario"}
          displayName={profile.display_name || "Usuário"}
          avatarUrl={profile.avatar_url || undefined}
          bannerUrl={profile.banner_url || undefined}
          bio={profile.bio || undefined}
          followersCount={profile.followers_count || 0}
          followingCount={profile.following_count || 0}
          postsCount={profile.posts_count || posts.length}
          isVerified={profile.is_verified || false}
          verificationBadge={profile.verification_type || "none"}
          isOwnProfile={true}
          walletBalance={profile.wallet_balance || 0}
          onTabChange={setActiveTab}
        />

        {/* Analytics Section (Compact) */}
        <AnimatePresence>
          {activeTab === "posts" && posts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <AnalyticsSection stats={profileStats} postCount={posts.length} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Grid */}
        <div className="mt-1">
          {loading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse" />
              ))}
            </div>
          ) : currentPosts.length === 0 ? (
            <EmptyState {...emptyState} />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="grid grid-cols-3 gap-0.5"
            >
              {currentPosts.map((post) => (
                <PostGridItem key={post.id} post={post} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

// --- Subcomponentes ---

const AnalyticsSection = ({ stats, postCount }: { stats: ProfileStats, postCount: number }) => (
  <div className="px-4 py-3 bg-muted/20 border-b border-border/40">
    <div className="flex items-center gap-2 mb-3">
      <BarChart3 className="w-4 h-4 text-primary" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Painel Profissional
      </span>
    </div>
    
    <div className="grid grid-cols-4 gap-2">
      <StatBox icon={<Heart className="w-3.5 h-3.5" />} value={stats.totalLikes} label="Likes" />
      <StatBox icon={<MessageCircle className="w-3.5 h-3.5" />} value={stats.totalComments} label="Comentários" />
      <StatBox icon={<Bookmark className="w-3.5 h-3.5" />} value={stats.totalSaves} label="Salvos" />
      <StatBox icon={<TrendingUp className="w-3.5 h-3.5" />} value={stats.avgEngagement} label="Engajamento" />
    </div>
  </div>
);

const StatBox = ({ icon, value, label }: { icon: any, value: number, label: string }) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-background rounded-xl p-2.5 flex flex-col items-center justify-center shadow-sm border border-border/50">
      <div className="text-muted-foreground mb-1">{icon}</div>
      <span className="text-sm font-bold text-foreground">{formatNumber(value)}</span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
};

const PostGridItem = ({ post }: { post: Post }) => {
  const formatTime = (date: string) => 
    formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: false });

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="aspect-square relative group cursor-pointer overflow-hidden bg-muted"
      whileTap={{ scale: 0.98 }}
    >
      {/* Content */}
      {post.content_type === "image" && post.content_url ? (
        <img
          src={post.content_url}
          alt="Post"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : post.content_type === "video" && post.content_url ? (
        <video
          src={post.content_url}
          className="w-full h-full object-cover"
          muted
          playsInline // Importante para iOS não abrir fullscreen automático
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2 bg-primary/5 text-center">
          <span className="text-[10px] text-foreground/60 line-clamp-4">
            {post.description}
          </span>
        </div>
      )}

      {/* Type Indicator (Icon Top Right) */}
      <div className="absolute top-2 right-2 text-white drop-shadow-md">
        {post.content_type === "video" ? (
          <Video className="w-4 h-4 fill-white/20" />
        ) : post.saves_count && post.saves_count > 0 ? (
          // Exemplo: Mostrar ícone se for carrossel (simulado aqui)
          <Layers className="w-4 h-4 fill-white/20" />
        ) : null}
      </div>

      {/* Hover Overlay (Desktop) */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white">
        <div className="flex items-center gap-1 font-semibold">
          <Heart className="w-5 h-5 fill-white" />
          <span>{post.likes_count}</span>
        </div>
        <div className="flex items-center gap-1 font-semibold">
          <MessageCircle className="w-5 h-5 fill-white" />
          <span>{post.comments_count || 0}</span>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ icon: Icon, title, sub }: { icon: any, title: string, sub: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 text-center px-4"
  >
    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4 text-muted-foreground">
      <Icon className="w-8 h-8" />
    </div>
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-[200px]">{sub}</p>
  </motion.div>
);

export default Profile;
