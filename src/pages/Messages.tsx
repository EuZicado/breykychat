import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatPreview } from "@/components/messages/ChatPreview";
import { ChatView } from "@/components/messages/ChatView";
import { NewConversationSheet } from "@/components/messages/NewConversationSheet";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { 
  Loader2, 
  Search, 
  X,
  SquarePen,
  ChevronLeft // Importante para o botão de voltar no mobile
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const Messages = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { conversations, isLoading: messagesLoading } = useMessages();
  const { onlineUsers } = usePresence();
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowNewConversation(false);
  };

  // Filtros e Ordenação
  const filteredConversations = useMemo(() => {
    let result = [...conversations];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv => 
        conv.otherUser?.display_name?.toLowerCase().includes(query) ||
        conv.otherUser?.username?.toLowerCase().includes(query)
      );
    }
    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return result;
  }, [conversations, searchQuery]);

  const stats = useMemo(() => {
    return {
      online: conversations.filter(c => c.otherUser && onlineUsers.includes(c.otherUser.id)).length,
    };
  }, [conversations, onlineUsers]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* 
        Atenção aqui: Movemos o AnimatePresence para controlar a tela cheia.
        Se houver chat selecionado, ele cobre tudo.
      */}
      <div className="relative h-[100dvh] overflow-hidden flex flex-col bg-background">
        
        <AnimatePresence mode="popLayout">
          {selectedConversationId ? (
            // ========================================================
            // VIEW DO CHAT (Estilo Slide-Over do Instagram)
            // ========================================================
            <motion.div
              key="chat-view"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              // CORREÇÃO DO BUG: fixed inset-0 garante que ocupe 100% da tela
              // z-50 garante que fique acima do header/menu
              className="fixed inset-0 z-50 bg-background flex flex-col h-[100dvh]"
            >
              {/* O ChatView deve gerenciar seu próprio header e input internamente.
                  Se ele não tiver botão de voltar, podemos adicionar um Header falso aqui se precisar */}
              <ChatView
                conversationId={selectedConversationId}
                onBack={() => setSelectedConversationId(null)}
              />
            </motion.div>
          ) : (
            // ========================================================
            // LISTA DE MENSAGENS
            // ========================================================
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: "-20%" }}
              className="flex flex-col h-full w-full"
            >
              {/* Header Fixo */}
              <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 shrink-0">
                <div className="flex items-center justify-between px-4 h-14">
                  <h1 className="text-xl font-bold tracking-tight cursor-pointer flex items-center gap-1">
                    {user?.username || "Direct"}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNewConversation(true)}
                  >
                    <SquarePen className="w-6 h-6" />
                  </Button>
                </div>
              </header>

              {/* Área de Scroll da Lista */}
              <ScrollArea className="flex-1 w-full">
                <div className="pb-24 pt-2">
                  {/* Busca */}
                  <div className="px-4 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar"
                        className="pl-9 pr-8 rounded-xl bg-muted/50 border-transparent h-9 text-sm focus-visible:ring-1"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stories / Online */}
                  {stats.online > 0 && !searchQuery && (
                    <div className="mb-6">
                      <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex px-4 gap-4 w-max">
                          <div className="flex flex-col items-center gap-1.5 cursor-pointer">
                             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center relative">
                               <span className="text-2xl text-muted-foreground">+</span>
                             </div>
                             <span className="text-[11px] text-muted-foreground">Nota</span>
                          </div>

                          {conversations
                            .filter(c => c.otherUser && onlineUsers.includes(c.otherUser.id))
                            .map(conv => (
                              <button
                                key={conv.id}
                                onClick={() => setSelectedConversationId(conv.id)}
                                className="flex flex-col items-center gap-1.5 min-w-[64px]"
                              >
                                <div className="relative">
                                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-green-400 to-green-600"> 
                                    <div className="w-full h-full rounded-full bg-background p-[2px] overflow-hidden">
                                      {conv.otherUser?.avatar_url ? (
                                        <img src={conv.otherUser.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                                      ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center rounded-full">
                                          {conv.otherUser?.display_name?.[0]}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[11px] text-foreground/80 truncate max-w-[70px]">
                                  {conv.otherUser?.display_name?.split(" ")[0]}
                                </span>
                              </button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="invisible" />
                      </ScrollArea>
                    </div>
                  )}

                  {/* Lista de Mensagens */}
                  <div className="px-4 flex justify-between items-center mb-2">
                    <span className="text-base font-semibold">Mensagens</span>
                    <span className="text-xs text-muted-foreground">Solicitações</span>
                  </div>

                  <div className="px-2 space-y-1">
                    {messagesLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma conversa encontrada.</div>
                    ) : (
                      filteredConversations.map((conversation) => (
                        <div key={conversation.id} className="rounded-xl hover:bg-muted/40 transition-colors">
                          <ChatPreview
                            id={conversation.id}
                            displayName={conversation.otherUser?.display_name || null}
                            username={conversation.otherUser?.username || null}
                            avatarUrl={conversation.otherUser?.avatar_url || null}
                            lastMessage={conversation.lastMessage?.content || null}
                            lastMessageTime={conversation.lastMessage?.created_at || conversation.updated_at}
                            unreadCount={conversation.unreadCount}
                            isOnline={conversation.otherUser ? onlineUsers.includes(conversation.otherUser.id) : false}
                            isVerified={conversation.otherUser?.is_verified || false}
                            verificationBadge={conversation.otherUser?.verification_type || "none"}
                            isAudioMessage={!!conversation.lastMessage?.audio_url}
                            isStickerMessage={!!conversation.lastMessage?.sticker_url}
                            onClick={() => setSelectedConversationId(conversation.id)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        <NewConversationSheet
          open={showNewConversation}
          onClose={() => setShowNewConversation(false)}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </AppLayout>
  );
};

export default Messages;
