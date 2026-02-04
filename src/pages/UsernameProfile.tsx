import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import UserProfile from "./UserProfile";

const UsernameProfile = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchUserByUsername = async () => {
      if (!username) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      // Remove @ if present
      const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .single();

      if (error || !data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setUserId(data.id);
      setIsLoading(false);
    };

    fetchUserByUsername();
  }, [username]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
        <p className="text-xl font-bold mb-2">Usuário não encontrado</p>
        <p className="text-muted-foreground mb-4">@{username} não existe</p>
        <button 
          onClick={() => navigate("/")}
          className="text-primary hover:underline"
        >
          Voltar para o início
        </button>
      </div>
    );
  }

  // Redirect to the user profile page with the userId
  if (userId) {
    navigate(`/user/${userId}`, { replace: true });
    return null;
  }

  return null;
};

export default UsernameProfile;
