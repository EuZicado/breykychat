import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, BadgeCheck, Grid3X3, Bookmark, Settings, MessageCircle, Heart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useMessages } from "@/hooks/useMessages";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MutualFollowers } from "@/components/profile/MutualFollowers";
import { FollowersSheet } from "@/components/profile/FollowersSheet";
import { PostModal } from "@/components/post/PostModal";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_verified: boolean;
  verification_type: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

interface Post {
  id: string;
  content_url: string | null;
  content_type: string;
  description: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { createConversation } = useMessages();
  const { canSendMessage } = useUserSettings();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followersSheetOpen, setFollowersSheetOpen] = useState(false);
  const [followersSheetTab, setFollowersSheetTab] = useState<"followers" | "following">("followers");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [canMessage, setCanMessage] = useState(true);
  const { isFollowing, isLoading: followLoading, followersCount, followingCount, toggleFollow } = useFollow(userId);

  const isOwnProfile = user?.id === userId;

  // Check if can message this user
  useEffect(() => {
    const checkCanMessage = async () => {
      if (!userId || isOwnProfile) return;
      const result = await canSendMessage(userId);
      setCanMessage(result);
    };
    checkCanMessage();
  }, [userId, isOwnProfile, canSendMessage]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      setIsLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setIsLoading(false);
        return;
      }

      setProfile(profileData as UserProfile);

      const { data: postsData } = await supabase
        .from("posts")
        .select("id, content_url, content_type, description, likes_count, comments_count, created_at")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });

      setPosts((postsData || []) as Post[]);
      setIsLoading(false);
    };

    fetchProfile();
  }, [userId]);

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

  const handleMessage = async () => {
    if (!userId) return;
    
    setIsSendingMessage(true);
    
    if (!canMessage) {
      toast.error("Este usuário não aceita mensagens de você");
      setIsSendingMessage(false);
      return;
    }
    
    const conversationId = await createConversation(userId);
    if (conversationId) {
      navigate("/messages");
    } else {
      toast.error("Erro ao iniciar conversa");
    }
    setIsSendingMessage(false);
  };

  const openFollowersSheet = (tab: "followers" | "following") => {
    setFollowersSheetTab(tab);
    setFollowersSheetOpen(true);
  };

  const openPostModal = (post: Post) => {
    setSelectedPost(post);
    setPostModalOpen(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-muted-foreground">Usuário não encontrado</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="glass-strong px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="tap-highlight-none">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold">
                    {profile.display_name || profile.username || "Usuário"}
                  </span>
                  {profile.is_verified && (
                    <BadgeCheck className={cn("w-4 h-4", getBadgeColor(profile.verification_type))} />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {posts.length} publicações
                </span>
              </div>
            </div>
            {isOwnProfile && (
              <button onClick={() => navigate("/profile")} className="tap-highlight-none">
                <Settings className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-r from-primary/30 to-accent/30">
        {profile.banner_url && (
          <img
            src={profile.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="flex items-end justify-between mb-4">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="text-2xl">
              {profile.display_name?.[0] || profile.username?.[0] || "?"}
            </AvatarFallback>
          </Avatar>

          {!isOwnProfile && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMessage}
                disabled={isSendingMessage}
                className="relative"
              >
                <MessageCircle className="w-4 h-4" />
                {!canMessage && (
                  <Lock className="w-3 h-3 absolute -top-1 -right-1 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant={isFollowing ? "outline" : "neon"}
                size="sm"
                onClick={toggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  "Seguindo"
                ) : (
                  "Seguir"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold">
              {profile.display_name || profile.username || "Usuário"}
            </h1>
            {profile.is_verified && (
              <BadgeCheck className={cn("w-5 h-5", getBadgeColor(profile.verification_type))} />
            )}
          </div>
          <p className="text-muted-foreground">@{profile.username || "unknown"}</p>
          {profile.bio && <p className="text-foreground">{profile.bio}</p>}
          
          {/* Mutual Followers */}
          {!isOwnProfile && userId && <MutualFollowers userId={userId} />}
        </div>

        {/* Stats - Clickable */}
        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <span className="font-bold">{posts.length}</span>
            <span className="text-sm text-muted-foreground ml-1">posts</span>
          </div>
          <button 
            onClick={() => openFollowersSheet("followers")}
            className="text-center tap-highlight-none"
          >
            <span className="font-bold">{followersCount}</span>
            <span className="text-sm text-muted-foreground ml-1">seguidores</span>
          </button>
          <button 
            onClick={() => openFollowersSheet("following")}
            className="text-center tap-highlight-none"
          >
            <span className="font-bold">{followingCount}</span>
            <span className="text-sm text-muted-foreground ml-1">seguindo</span>
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full grid grid-cols-2 glass-strong rounded-none border-y border-white/10">
          <TabsTrigger value="posts" className="data-[state=active]:bg-primary/20">
            <Grid3X3 className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger value="saved" className="data-[state=active]:bg-primary/20">
            <Bookmark className="w-5 h-5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="pb-24">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Grid3X3 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma publicação ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openPostModal(post)}
                  className="aspect-square bg-muted relative cursor-pointer group"
                >
                  {post.content_url && (
                    <img
                      src={post.content_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-white">
                      <Heart className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{post.comments_count || 0}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="pb-24">
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isOwnProfile ? "Suas publicações salvas aparecerão aqui" : "Posts salvos são privados"}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Followers Sheet */}
      <FollowersSheet
        open={followersSheetOpen}
        onOpenChange={setFollowersSheetOpen}
        userId={userId || ""}
        username={profile.username || "usuario"}
        initialTab={followersSheetTab}
      />

      {/* Post Modal */}
      {selectedPost && profile && (
        <PostModal
          isOpen={postModalOpen}
          onClose={() => setPostModalOpen(false)}
          post={{
            ...selectedPost,
            creator: {
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              is_verified: profile.is_verified,
              verification_type: profile.verification_type
            }
          }}
        />
      )}
    </AppLayout>
  );
};

export default UserProfile;
