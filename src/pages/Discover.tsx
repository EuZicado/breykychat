import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Search, X, Loader2, BadgeCheck, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const Discover = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { users, isLoading, query, search, getSuggestedUsers, clear } = useSearch();
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    getSuggestedUsers();
  }, [getSuggestedUsers]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchValue) {
        search(searchValue);
      } else {
        getSuggestedUsers();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchValue, search, getSuggestedUsers]);

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
      <header className="sticky top-0 z-40 safe-top">
        <div className="glass-strong px-4 py-3">
          <h1 className="text-xl font-bold font-display mb-3">Descobrir</h1>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar usuários..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 pr-10 ios-search"
            />
            {searchValue && (
              <button
                onClick={() => {
                  setSearchValue("");
                  clear();
                  getSuggestedUsers();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-4 pb-24">
        {!query && (
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Sugeridos para você</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {query ? "Nenhum usuário encontrado" : "Nenhum usuário para mostrar"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((profile, index) => (
              <motion.button
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/user/${profile.id}`)}
                className="w-full ios-list-item flex items-center gap-3 p-3 rounded-xl text-left"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback>
                    {profile.display_name?.[0] || profile.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground truncate">
                      {profile.display_name || profile.username || "Usuário"}
                    </span>
                    {profile.is_verified && (
                      <BadgeCheck className={cn("w-4 h-4 flex-shrink-0", getBadgeColor(profile.verification_type))} />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground truncate block">
                    @{profile.username || "unknown"}
                  </span>
                  {profile.bio && (
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {profile.bio}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {profile.followers_count} seguidores
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;