import { useState } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Trash2, 
  Lock, 
  Unlock, 
  Flag, 
  Share2, 
  Bookmark,
  Copy,
  UserMinus,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePostActions } from "@/hooks/usePostActions";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PostOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  creatorId: string;
  isPrivate?: boolean;
  onPostDeleted?: () => void;
  onPrivacyChanged?: () => void;
}

export const PostOptionsSheet = ({
  open,
  onClose,
  postId,
  creatorId,
  isPrivate = false,
  onPostDeleted,
  onPrivacyChanged,
}: PostOptionsSheetProps) => {
  const { user } = useAuth();
  const { deletePost, togglePrivacy, isLoading } = usePostActions();
  const { isPostSaved, toggleSavePost } = useSavedPosts();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const isOwner = user?.id === creatorId;
  const isSaved = isPostSaved(postId);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Confira este post no BRΞYK!",
          url: shareUrl,
        });
        toast.success("Post compartilhado!");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copiado!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    }
    onClose();
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
    onClose();
  };

  const handleSave = async () => {
    await toggleSavePost(postId);
    onClose();
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    const success = await deletePost(postId);
    if (success) {
      onPostDeleted?.();
      onClose();
    }
  };

  const handleTogglePrivacy = async () => {
    const success = await togglePrivacy(postId, isPrivate);
    if (success) {
      onPrivacyChanged?.();
      onClose();
    }
  };

  const handleReport = () => {
    setShowReportDialog(true);
  };

  const submitReport = async (reason: string) => {
    setShowReportDialog(false);
    toast.success("Denúncia enviada. Obrigado pelo feedback!");
    onClose();
  };

  const ownerOptions = [
    {
      icon: isPrivate ? Unlock : Lock,
      label: isPrivate ? "Tornar público" : "Tornar privado",
      description: isPrivate ? "Todos poderão ver este post" : "Somente você verá este post",
      onClick: handleTogglePrivacy,
      color: "text-foreground",
    },
    {
      icon: Share2,
      label: "Compartilhar",
      description: "Compartilhar via apps ou copiar link",
      onClick: handleShare,
      color: "text-foreground",
    },
    {
      icon: Copy,
      label: "Copiar link",
      description: "Copiar link do post",
      onClick: handleCopyLink,
      color: "text-foreground",
    },
    {
      icon: Trash2,
      label: "Excluir post",
      description: "Esta ação não pode ser desfeita",
      onClick: () => setShowDeleteConfirm(true),
      color: "text-destructive",
    },
  ];

  const viewerOptions = [
    {
      icon: Share2,
      label: "Compartilhar",
      description: "Compartilhar via apps ou copiar link",
      onClick: handleShare,
      color: "text-foreground",
    },
    {
      icon: Bookmark,
      label: isSaved ? "Remover dos salvos" : "Salvar post",
      description: isSaved ? "Remover da sua coleção" : "Salvar para ver depois",
      onClick: handleSave,
      color: "text-foreground",
    },
    {
      icon: Copy,
      label: "Copiar link",
      description: "Copiar link do post",
      onClick: handleCopyLink,
      color: "text-foreground",
    },
    {
      icon: UserMinus,
      label: "Não tenho interesse",
      description: "Mostrar menos posts como este",
      onClick: () => {
        toast.info("Preferência salva");
        onClose();
      },
      color: "text-foreground",
    },
    {
      icon: Flag,
      label: "Denunciar",
      description: "Denunciar conteúdo inapropriado",
      onClick: handleReport,
      color: "text-destructive",
    },
  ];

  const options = isOwner ? ownerOptions : viewerOptions;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="pb-2">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
            <SheetTitle className="text-center text-lg font-semibold">
              Opções
            </SheetTitle>
          </SheetHeader>

          <div className="py-2 space-y-1">
            {options.map((option, index) => (
              <motion.button
                key={option.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={option.onClick}
                disabled={isLoading}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${option.color}`}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <option.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${option.color}`}>{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-2 p-4 text-center font-medium text-muted-foreground hover:bg-muted/50 rounded-2xl transition-colors"
          >
            Cancelar
          </button>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Excluir post?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Esta ação não pode ser desfeita. O post e todos os comentários, curtidas e salvamentos serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir permanentemente
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-xl mt-0">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Por que você está denunciando?</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o motivo da denúncia
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            {[
              "Spam ou golpe",
              "Nudez ou atividade sexual",
              "Discurso de ódio",
              "Violência ou ameaças",
              "Informação falsa",
              "Outro",
            ].map((reason) => (
              <button
                key={reason}
                onClick={() => submitReport(reason)}
                className="w-full p-3 text-left rounded-xl hover:bg-muted/50 active:bg-muted transition-colors"
              >
                {reason}
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full rounded-xl">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
