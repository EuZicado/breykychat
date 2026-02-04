import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Settings, Share2, Grid3X3, Bookmark, Heart, Camera, LogOut, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FollowersSheet } from "@/components/profile/FollowersSheet";

interface ProfileHeaderProps {
  userId?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified?: boolean;
  verificationBadge?: "none" | "blue" | "gold" | "staff";
  isOwnProfile?: boolean;
  walletBalance?: number;
  onTabChange?: (tab: "posts" | "saved" | "liked") => void;
}

export const ProfileHeader = ({
  userId,
  username,
  displayName,
  avatarUrl,
  bannerUrl,
  bio,
  followersCount,
  followingCount,
  postsCount,
  isVerified,
  verificationBadge = "blue",
  isOwnProfile = true,
  walletBalance = 0,
  onTabChange,
}: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const { user, profile: currentProfile, refreshProfile } = useAuth();
  const { isFollowing, toggleFollow, isLoading: followLoading, followersCount: liveFollowers } = useFollow(userId);
  const { createConversation } = useMessages();
  const { canSendMessage } = useUserSettings();
  
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "liked">("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(displayName);
  const [editBio, setEditBio] = useState(bio || "");
  const [editUsername, setEditUsername] = useState(username);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [followersSheetOpen, setFollowersSheetOpen] = useState(false);
  const [followersSheetTab, setFollowersSheetTab] = useState<"followers" | "following">("followers");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const actualFollowers = isOwnProfile ? followersCount : (liveFollowers || followersCount);

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

  const handleTabClick = (tab: "posts" | "saved" | "liked") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleFollow = async () => {
    await toggleFollow();
    toast.success(isFollowing ? "Deixou de seguir" : "Seguindo!");
  };

  const handleMessage = async () => {
    if (!userId) return;
    
    setIsSendingMessage(true);
    
    // Check if can message
    const canMessage = await canSendMessage(userId);
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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/user/${userId || user?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${username} no BRΞYK`,
          text: `Confira o perfil de ${displayName} no BRΞYK!`,
          url: shareUrl,
        });
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copiado!");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    }
  };

  const openFollowersSheet = (tab: "followers" | "following") => {
    setFollowersSheetTab(tab);
    setFollowersSheetOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Até logo!");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      let newAvatarUrl = avatarUrl;
      let newBannerUrl = bannerUrl;

      // Upload avatar
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
          
        newAvatarUrl = publicUrl;
      }

      // Upload banner
      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const filePath = `${user.id}/banner.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("banners")
          .upload(filePath, bannerFile, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("banners")
          .getPublicUrl(filePath);
          
        newBannerUrl = publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editDisplayName,
          username: editUsername,
          bio: editBio,
          avatar_url: newAvatarUrl,
          banner_url: newBannerUrl,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado!");
      setEditOpen(false);
      refreshProfile?.();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
    { id: "saved", icon: Bookmark, label: "Salvos" },
    { id: "liked", icon: Heart, label: "Curtidos" },
  ] as const;

  return (
    <>
      <div className="relative">
        {/* Banner */}
        <div className="relative h-40 bg-muted">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button variant="glass" size="icon-sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            {isOwnProfile && (
              <>
                <Button variant="glass" size="icon-sm" onClick={() => setEditOpen(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="glass" size="icon-sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Avatar & Info */}
        <div className="px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-full border-4 border-background bg-muted overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              {isVerified && (
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center",
                  verificationBadge === "gold" ? "bg-warning" : verificationBadge === "staff" ? "bg-accent" : "bg-blue-500"
                )}>
                  <BadgeCheck className="w-5 h-5 text-black" />
                </div>
              )}
            </motion.div>
            
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display">{displayName}</h1>
              </div>
              <p className="text-muted-foreground">@{username}</p>
            </div>
          </div>

          {/* Bio */}
          {bio && <p className="mt-4 text-foreground/90 text-sm">{bio}</p>}

          {/* Stats - Clickable */}
          <div className="flex gap-6 mt-4">
            <StatItem label="Posts" value={formatNumber(postsCount)} />
            <button onClick={() => openFollowersSheet("followers")} className="tap-highlight-none">
              <StatItem label="Seguidores" value={formatNumber(actualFollowers)} />
            </button>
            <button onClick={() => openFollowersSheet("following")} className="tap-highlight-none">
              <StatItem label="Seguindo" value={formatNumber(followingCount)} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            {isOwnProfile ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => setEditOpen(true)}>
                  Editar Perfil
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant={isFollowing ? "outline" : "gradient"} 
                  className="flex-1"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {isFollowing ? "Seguindo" : "Seguir"}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleMessage}
                  disabled={isSendingMessage}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="flex mt-6 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 relative transition-colors tap-highlight-none",
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="profile-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Foto de Perfil</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
                  {avatarFile ? (
                    <img 
                      src={URL.createObjectURL(avatarFile)} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    Alterar
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Banner</Label>
              <div className="h-20 rounded-lg bg-muted overflow-hidden">
                {bannerFile ? (
                  <img 
                    src={URL.createObjectURL(bannerFile)} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : bannerUrl ? (
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" asChild className="w-full">
                <label className="cursor-pointer">
                  Alterar Banner
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  />
                </label>
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome</Label>
              <Input 
                id="displayName" 
                value={editDisplayName} 
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={editUsername} 
                onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="seu_username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                value={editBio} 
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                rows={3}
              />
            </div>

            <Button 
              className="w-full" 
              variant="gradient"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followers Sheet */}
      <FollowersSheet
        open={followersSheetOpen}
        onOpenChange={setFollowersSheetOpen}
        userId={userId || user?.id || ""}
        username={username}
        initialTab={followersSheetTab}
      />
    </>
  );
};

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <p className="font-bold text-foreground font-display">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);
