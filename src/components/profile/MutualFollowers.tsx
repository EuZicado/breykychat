import { useMutualFollowers } from "@/hooks/useMutualFollowers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

interface MutualFollowersProps {
  userId: string;
}

export const MutualFollowers = ({ userId }: MutualFollowersProps) => {
  const { mutualFollowers, isLoading } = useMutualFollowers(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
      </div>
    );
  }

  if (mutualFollowers.length === 0) {
    return null;
  }

  const displayNames = mutualFollowers.slice(0, 2).map(
    (f) => f.display_name || f.username || "Usuário"
  );

  const othersCount = mutualFollowers.length > 2 ? mutualFollowers.length - 2 : 0;

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex -space-x-2">
        {mutualFollowers.slice(0, 3).map((follower) => (
          <Avatar key={follower.id} className="w-5 h-5 border border-background">
            <AvatarImage src={follower.avatar_url || ""} />
            <AvatarFallback className="text-[8px]">
              {follower.display_name?.[0] || follower.username?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Seguido por{" "}
        <span className="text-foreground">
          {displayNames.join(", ")}
          {othersCount > 0 && ` e mais ${othersCount}`}
        </span>
      </p>
    </div>
  );
};
