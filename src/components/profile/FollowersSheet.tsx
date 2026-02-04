import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, Loader2, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFollowersList } from "@/hooks/useFollowersList";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface FollowersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  initialTab?: "followers" | "following";
}

export const FollowersSheet = ({
  open,
  onOpenChange,
  userId,
  username,
  initialTab = "followers",
}: FollowersSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const {
    followers,
    following,
    isLoadingFollowers,
    isLoadingFollowing,
    fetchFollowers,
    fetchFollowing,
  } = useFollowersList(userId);

  useEffect(() => {
    if (open) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [open, fetchFollowers, fetchFollowing]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/user/${userId}`);
  };

  const getBadgeColor = (type: string | null) => {
    switch (type) {
      case "gold":
        return "text-warning";
      case "staff":
        return "text-accent";
      default:
        return "text-blue-500";
    }
  };

  const UserItem = ({ userItem }: { userItem: typeof followers[0] }) => {
    const { isFollowing, toggleFollow, isLoading } = useFollow(userItem.id);
    const isOwnProfile = user?.id === userItem.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between py-3"
      >
        <button
          onClick={() => handleUserClick(userItem.id)}
          className="flex items-center gap-3 flex-1 tap-highlight-none"
        >
          <Avatar className="w-12 h-12">
            <AvatarImage src={userItem.avatar_url || ""} />
            <AvatarFallback>
              {userItem.display_name?.[0] || userItem.username?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="font-semibold">
                {userItem.display_name || userItem.username || "Usuário"}
              </span>
              {userItem.is_verified && (
                <BadgeCheck
                  className={cn("w-4 h-4", getBadgeColor(userItem.verification_type))}
                />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              @{userItem.username || "unknown"}
            </span>
          </div>
        </button>

        {!isOwnProfile && (
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={toggleFollow}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              "Seguindo"
            ) : (
              "Seguir"
            )}
          </Button>
        )}
      </motion.div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">@{username}</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")}>
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="followers">
              Seguidores ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Seguindo ({following.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="max-h-[60vh] overflow-y-auto">
            {isLoadingFollowers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum seguidor ainda
              </div>
            ) : (
              <div className="space-y-1">
                {followers.map((follower) => (
                  <UserItem key={follower.id} userItem={follower} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="max-h-[60vh] overflow-y-auto">
            {isLoadingFollowing ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : following.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Não está seguindo ninguém
              </div>
            ) : (
              <div className="space-y-1">
                {following.map((followingUser) => (
                  <UserItem key={followingUser.id} userItem={followingUser} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
