import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Search, Loader2, Lock, BadgeCheck, MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserSearch, useConversationActions } from "@/hooks/messages";
import { toast } from "sonner";
import type { SearchableUser } from "@/types/messages";

interface NewConversationSheetProps {
  open: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

export const NewConversationSheet = ({ 
  open, 
  onClose, 
  onConversationCreated 
}: NewConversationSheetProps) => {
  const { query, setQuery, results, isSearching, clearSearch } = useUserSearch();
  const { createConversation } = useConversationActions();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      clearSearch();
      setSelectedUserId(null);
    }
  }, [open, clearSearch]);

  const handleSelectUser = async (selectedUser: SearchableUser) => {
    if (!selectedUser.can_message) {
      toast.error("Este usuário não aceita mensagens de você");
      return;
    }

    setSelectedUserId(selectedUser.id);

    try {
      const result = await createConversation(selectedUser.id);
      
      if (result.success && result.conversationId) {
        onConversationCreated(result.conversationId);
        onClose();
      } else {
        toast.error(result.error || "Erro ao iniciar conversa");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Erro ao iniciar conversa");
    } finally {
      setSelectedUserId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">Nova Mensagem</SheetTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar usuários..."
            className="pl-10 bg-muted/50 border-0 rounded-xl h-12"
            autoFocus
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Buscando usuários...</p>
            </div>
          ) : !query ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Buscar pessoas</p>
              <p className="text-sm text-muted-foreground mt-1">
                Digite o nome ou @username
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente outro nome ou username
              </p>
            </div>
          ) : (
            results.map((u, index) => (
              <motion.button
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, type: "spring", damping: 25, stiffness: 300 }}
                onClick={() => handleSelectUser(u)}
                disabled={selectedUserId !== null || !u.can_message}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  u.can_message 
                    ? "hover:bg-muted/50 active:bg-muted active:scale-[0.98]" 
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <Avatar className="w-14 h-14">
                  <AvatarImage src={u.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-lg font-semibold">
                    {(u.display_name || u.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold flex items-center gap-1.5">
                    {u.display_name || u.username || "Usuário"}
                    {u.is_verified && (
                      <BadgeCheck className="w-4 h-4 text-primary" />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{u.username || "usuario"}
                  </p>
                </div>
                {!u.can_message && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs">Bloqueado</span>
                  </div>
                )}
                {selectedUserId === u.id && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </motion.button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
