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
  Eye,
  Share2,
  BarChart3,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  totalShares: number;
  avgEngagement: number;
  topPost: Post | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { savedPosts, isLoading: savedLoading } = useSavedPosts();

  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "liked">("posts");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select("id, content_url, content_type, description, created_at, likes_count, comments_count, shares_count, saves_count")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data || []);
      }
      setIsLoadingPosts(false);
    };

    if (user) {
      fetchUserPosts();
    }
  }, [user]);

  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (!user || activeTab !== "liked") return;

      setIsLoadingLiked(true);

      const { data: likes, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (likesError) {
        console.error("Error fetching likes:", likesError);
        setIsLoadingLiked(false);
        return;
      }

      if (!likes || likes.length === 0) {
        setLikedPosts([]);
        setIsLoadingLiked(false);
        return;
      }

      const postIds = likes.map((l) => l.post_id);

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, content_url, content_type, description, created_at, likes_count, comments_count, shares_count, saves_count")
        .in("id", postIds);

      if (postsError) {
        console.error("Error fetching posts:", postsError);
      } else {
        setLikedPosts(postsData || []);
      }

      setIsLoadingLiked(false);
    };

    fetchLikedPosts();
  }, [user, activeTab]);

  // Calculate profile stats
  const profileStats: ProfileStats = useMemo(() => {
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const totalSaves = posts.reduce((sum, p) => sum + (p.saves_count || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
    const avgEngagement = posts.length > 0 
      ? Math.round((totalLikes + totalComments + totalSaves + totalShares) / posts.length) 
      : 0;
    
    const topPost = posts.length > 0 
      ? posts.reduce((max, p) => (p.likes_count > (max?.likes_count || 0) ? p : max), posts[0])
      : null;

    return { totalLikes, totalComments, totalSaves, totalShares, avgEngagement, topPost };
  }, [posts]);

  const handleTabChange = (tab: "posts" | "saved" | "liked") => {
    setActiveTab(tab);
  };

  const getCurrentPosts = (): Post[] => {
    switch (activeTab) {
      case "saved":
        return savedPosts
          .filter((sp) => sp.post)
          .map((sp) => ({
            id: sp.post!.id,
            content_url: sp.post!.content_url,
            content_type: sp.post!.content_type as "video" | "image" | "text",
            description: sp.post!.description,
            created_at: sp.created_at,
            likes_count: sp.post!.likes_count,
            comments_count: 0,
            shares_count: 0,
            saves_count: 0,
          }));
      case "liked":
        return likedPosts;
      default:
        return posts;
    }
  };

  const isCurrentLoading = () => {
    switch (activeTab) {
      case "saved":
        return savedLoading;
      case "liked":
        return isLoadingLiked;
      default:
        return isLoadingPosts;
    }
  };

  const getEmptyState = () => {
    switch (activeTab) {
      case "saved":
        return {
          icon: Bookmark,
          title: "Nenhum post salvo",
          subtitle: "Posts que você salvar aparecerão aqui",
        };
      case "liked":
        return {
          icon: Heart,
          title: "Nenhum post curtido",
          subtitle: "Posts que você curtir aparecerão aqui",
        };
      default:
        return {
          icon: Grid3X3,
          title: "Nenhuma publicação",
          subtitle: "Suas postagens aparecerão aqui",
        };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: false,
      locale: ptBR,
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Perfil não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  const getVerificationType = (): "none" | "blue" | "gold" | "staff" => {
    return profile.verification_type || "none";
  };

  const currentPosts = getCurrentPosts();
  const loading = isCurrentLoading();
  const emptyState = getEmptyState();

  return (
    <AppLayout>
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
        verificationBadge={getVerificationType()}
        isOwnProfile={true}
        walletBalance={profile.wallet_balance || 0}
        onTabChange={handleTabChange}
      />

      {/* Analytics Dashboard - Only shown on own profile for "posts" tab */}
      {activeTab === "posts" && posts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-4 space-y-4"
        >
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Heart className="w-5 h-5" />}
              iconBg="bg-red-500/10"
              iconColor="text-red-400"
              value={profileStats.totalLikes}
              label="Total de curtidas"
              trend={posts.length > 0 ? `~${Math.round(profileStats.totalLikes / posts.length)}/post` : ""}
            />
            <StatCard
              icon={<MessageCircle className="w-5 h-5" />}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-400"
              value={profileStats.totalComments}
              label="Comentários"
              trend={posts.length > 0 ? `~${Math.round(profileStats.totalComments / posts.length)}/post` : ""}
            />
            <StatCard
              icon={<Bookmark className="w-5 h-5" />}
              iconBg="bg-amber-500/10"
              iconColor="text-amber-400"
              value={profileStats.totalSaves}
              label="Salvamentos"
              trend=""
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              iconBg="bg-green-500/10"
              iconColor="text-green-400"
              value={profileStats.avgEngagement}
              label="Engajamento médio"
              trend="por post"
            />
          </div>

          {/* Top Post Highlight */}
          {profileStats.topPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Post mais popular</span>
              </div>
              <div className="flex items-center gap-3">
                {profileStats.topPost.content_url && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {profileStats.topPost.content_type === "video" ? (
                      <video
                        src={profileStats.topPost.content_url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={profileStats.topPost.content_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {profileStats.topPost.description || "Sem descrição"}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-sm">
                      <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                      {formatNumber(profileStats.topPost.likes_count)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      {formatNumber(profileStats.topPost.comments_count || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Posts Grid */}
      <div className="pb-24">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          ) : currentPosts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-16 text-center px-8"
            >
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <emptyState.icon className="w-10 h-10 text-primary" />
              </div>
              <p className="text-xl font-semibold text-foreground">{emptyState.title}</p>
              <p className="text-sm text-muted-foreground mt-2">{emptyState.subtitle}</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-0.5"
            >
              {currentPosts.map((post, index) => (
                <motion.button
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="aspect-square relative overflow-hidden tap-highlight-none group"
                  onClick={() => {
                    /* TODO: Navigate to post */
                  }}
                >
                  {post.content_type === "image" && post.content_url ? (
                    <img
                      src={post.content_url}
                      alt={post.description || ""}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : post.content_type === "video" && post.content_url ? (
                    <div className="w-full h-full bg-muted relative">
                      <video
                        src={post.content_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center p-3">
                      <p className="text-xs text-muted-foreground line-clamp-3 text-center">
                        {post.description || "Texto"}
                      </p>
                    </div>
                  )}

                  {/* Hover overlay with stats */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-4 text-white">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-5 h-5 fill-white" />
                        <span className="font-semibold">{formatNumber(post.likes_count)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-semibold">{formatNumber(post.comments_count || 0)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-white/70 mt-2">
                      {formatTimeAgo(post.created_at)}
                    </span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

const StatCard = ({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  trend,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  trend: string;
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-muted/30 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{formatNumber(value)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {trend && (
        <p className="text-[10px] text-muted-foreground/70 mt-1">{trend}</p>
      )}
    </div>
  );
};

export default Profile;
