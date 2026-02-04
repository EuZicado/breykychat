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
  SquarePen, // Ícone mais parecido com o de "escrever" do Instagram
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // ScrollBar horizontal é útil

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

  // Calculate stats (mantido para lógica interna, mas escondido visualmente se não necessário)
  const stats = useMemo(() => {
    return {
      total: conversations.length,
      online: conversations.filter(c => c.otherUser && onlineUsers.includes(c.otherUser.id)).length,
    };
  }, [conversations, onlineUsers]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
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
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-screen bg-background"
          >
            {/* Instagram-style Header */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
              <div className="px-4 py-3">
                {/* Top Bar: Title & Action */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight">
                      {user?.username || "Direct"}
                    </h1>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNewConversation(true)}
                    className="hover:bg-muted rounded-full"
                  >
                    <SquarePen className="w-6 h-6" />
                  </Button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar"
                    className="pl-9 pr-9 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary h-9 text-sm transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Online Users Row ("Stories" style) */}
              {stats.online > 0 && !searchQuery && (
                <div className="pb-3 px-4">
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-4">
                      {conversations
                        .filter(c => c.otherUser && onlineUsers.includes(c.otherUser.id))
                        .map((conv, i) => (
                          <motion.button
                            key={conv.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedConversationId(conv.id)}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className="relative p-0.5 rounded-full ring-2 ring-primary/20">
                              <div className="w-14 h-14 rounded-full bg-muted overflow-hidden">
                                {conv.otherUser?.avatar_url ? (
                                  <img
                                    src={conv.otherUser.avatar_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-medium text-lg">
                                    {conv.otherUser?.display_name?.[0]?.toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-background" />
                            </div>
                            <span className="text-[11px] text-muted-foreground w-16 truncate text-center leading-tight">
                              {conv.otherUser?.display_name?.split(" ")[0]}
                            </span>
                          </motion.button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="invisible" />
                  </ScrollArea>
                </div>
              )}
            </header>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              <div className="px-2 pb-24 pt-2">
                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-base font-semibold">Nenhuma conversa encontrada</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-6">
                      {searchQuery ? "Tente outro termo de busca." : "Comece a conversar com seus amigos."}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowNewConversation(true)}>
                        Enviar mensagem
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Render list without explicit section headers for cleaner look, 
                        but keep order (Unread on top) */}
                    {filteredConversations.map((conversation, index) => (
                      <motion.div
                        key={conversation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
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
                          // Add specific className prop to ChatPreview if supported to allow hover effects
                          // className="hover:bg-muted/40 rounded-xl transition-colors" 
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* New Conversation Sheet */}
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
