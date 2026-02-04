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
  SquarePen, // Ícone estilo nova mensagem do Insta
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Importe ScrollBar se disponível no seu ui/scroll-area

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

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv => 
        conv.otherUser?.display_name?.toLowerCase().includes(query) ||
        conv.otherUser?.username?.toLowerCase().includes(query)
      );
    }

    // Sort: unread first, then by date
    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  }, [conversations, searchQuery]);

  // Calculate stats (Mantido apenas para lógica interna se necessário, mas removido da UI para limpar)
  const stats = useMemo(() => {
    const onlineCount = conversations.filter(c => 
      c.otherUser && onlineUsers.includes(c.otherUser.id)
    ).length;
    
    return {
      online: onlineCount,
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
      <AnimatePresence mode="wait">
        {selectedConversationId ? (
          <ChatView
            key="chat"
            conversationId={selectedConversationId}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }} // Transição mais sutil estilo iOS
            transition={{ duration: 0.2 }}
            className="flex flex-col h-[100dvh] bg-background"
          >
            {/* Instagram Style Header */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
              <div className="flex items-center justify-between px-4 h-14">
                <div className="flex items-center gap-1 cursor-pointer">
                  <h1 className="text-xl font-bold tracking-tight">
                    {user?.username || "Direct"}
                  </h1>
                  {/* Opcional: ChevronDown aqui se quiser simular troca de conta */}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewConversation(true)}
                  className="text-foreground hover:bg-muted rounded-full"
                >
                  <SquarePen className="w-6 h-6" strokeWidth={2.5} />
                </Button>
              </div>
            </header>

            {/* Main Scroll Area */}
            <ScrollArea className="flex-1">
              <div className="pb-20 pt-2">
                {/* Search Bar */}
                <div className="px-4 mb-4">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar"
                      className="pl-9 pr-8 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 h-9 text-sm transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Online Users (Stories Style) */}
                {stats.online > 0 && !searchQuery && (
                  <div className="mb-6">
                    <ScrollArea className="w-full whitespace-nowrap">
                      <div className="flex px-4 gap-4 w-max">
                        {/* Seu Próprio 'Story' (Opcional/Placeholder) */}
                        <div className="flex flex-col items-center gap-1.5 cursor-pointer">
                           <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center relative overflow-hidden ring-2 ring-transparent">
                             <div className="text-2xl text-muted-foreground">+</div>
                           </div>
                           <span className="text-[11px] text-muted-foreground">Nota</span>
                        </div>

                        {conversations
                          .filter(c => c.otherUser && onlineUsers.includes(c.otherUser.id))
                          .map(conv => (
                            <motion.button
                              key={conv.id}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedConversationId(conv.id)}
                              className="flex flex-col items-center gap-1.5 min-w-[64px]"
                            >
                              <div className="relative">
                                {/* Gradiente de Story do Insta no anel externo se quiser, aqui usei verde simples */}
                                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-green-400 to-green-600"> 
                                  <div className="w-full h-full rounded-full bg-background p-[2px] overflow-hidden">
                                    {conv.otherUser?.avatar_url ? (
                                      <img
                                        src={conv.otherUser.avatar_url}
                                        alt=""
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-muted flex items-center justify-center rounded-full text-muted-foreground font-medium">
                                        {conv.otherUser?.display_name?.[0]?.toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background z-10" />
                              </div>
                              <span className="text-[11px] text-foreground/80 truncate max-w-[70px]">
                                {conv.otherUser?.display_name?.split(" ")[0]}
                              </span>
                            </motion.button>
                          ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="hidden" />
                    </ScrollArea>
                  </div>
                )}

                {/* List Header */}
                <div className="px-4 mb-2 flex justify-between items-center">
                  <span className="text-base font-semibold">Mensagens</span>
                  <span className="text-xs text-muted-foreground cursor-pointer hover:text-primary">Solicitações</span>
                </div>

                {/* Messages List */}
                <div className="px-2">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Carregando conversas...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">
                        {searchQuery ? "Nenhum resultado" : "Suas mensagens"}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mb-6">
                        {searchQuery
                          ? "Não encontramos ninguém com esse nome."
                          : "Envie mensagens privadas para amigos e grupos."}
                      </p>
                      {!searchQuery && (
                        <Button
                          onClick={() => setShowNewConversation(true)}
                          variant="secondary"
                          className="font-semibold"
                        >
                          Enviar mensagem
                        </Button>
                      )}
                    </motion.div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredConversations.map((conversation, index) => (
                        <motion.div
                          key={conversation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          // Adiciona hover effect estilo desktop mas sutil
                          className="rounded-xl overflow-hidden hover:bg-muted/40 transition-colors"
                        >
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
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* New Conversation Sheet (Mantida funcionalidade, mas acionada pelo Header) */}
            <NewConversationSheet
              open={showNewConversation}
              onClose={() => setShowNewConversation(false)}
              onConversationCreated={handleConversationCreated}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default Messages;
