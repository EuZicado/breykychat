import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const usePostActions = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const deletePost = async (postId: string): Promise<boolean> => {
    if (!user) {
      toast.error("Faça login para deletar posts");
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("delete_user_post", {
        post_id: postId,
      });

      if (error) {
        console.error("Error deleting post:", error);
        toast.error("Erro ao deletar post");
        return false;
      }

      if (data) {
        toast.success("Post deletado com sucesso");
        return true;
      } else {
        toast.error("Você não pode deletar este post");
        return false;
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Erro ao deletar post");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePrivacy = async (postId: string, currentPrivacy: boolean): Promise<boolean> => {
    if (!user) {
      toast.error("Faça login para alterar privacidade");
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ is_private: !currentPrivacy })
        .eq("id", postId)
        .eq("creator_id", user.id);

      if (error) {
        console.error("Error toggling privacy:", error);
        toast.error("Erro ao alterar privacidade");
        return false;
      }

      toast.success(currentPrivacy ? "Post tornado público" : "Post tornado privado");
      return true;
    } catch (error) {
      console.error("Error toggling privacy:", error);
      toast.error("Erro ao alterar privacidade");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const reportPost = async (postId: string, reason: string): Promise<boolean> => {
    if (!user) {
      toast.error("Faça login para denunciar");
      return false;
    }

    // For now, just show a success message
    // In production, you would store reports in a separate table
    toast.success("Denúncia enviada. Obrigado pelo feedback!");
    return true;
  };

  return {
    deletePost,
    togglePrivacy,
    reportPost,
    isLoading,
  };
};
