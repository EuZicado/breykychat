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
  MessageCircle, 
  Search, 
  Plus, 
  Settings2, 
  X,
  Mail,
  MailOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const Messages = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { conversations, isLoading: messagesLoading, createConversation } = useMessages();
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

  // Calculate stats
  const stats = useMemo(() => {
    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    const onlineCount = conversations.filter(c => 
      c.otherUser && onlineUsers.includes(c.otherUser.id)
    ).length;
    
    return {
      total: conversations.length,
      unread: totalUnread,
      online: onlineCount,
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
            className="flex flex-col h-screen"
          >
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 safe-top">
              <div className="glass-strong px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold">Mensagens</h1>
                      <p className="text-xs text-muted-foreground">
                        {stats.total} conversas
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                  >
                    <Settings2 className="w-5 h-5" />
                  </Button>
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="rounded-full gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {stats.online} online
                  </Badge>
                  <Badge variant="secondary" className="rounded-full gap-1.5">
                    <Mail className="w-3 h-3" />
                    {stats.total}
                  </Badge>
                  {stats.unread > 0 && (
                    <Badge variant="default" className="rounded-full gap-1.5">
                      <MailOpen className="w-3 h-3" />
                      {stats.unread} não lidas
                    </Badge>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar conversas..."
                    className="pl-10 pr-10 rounded-xl bg-muted/30 border-0 h-10"
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
            </header>

            {/* Online Users Scroll */}
            {stats.online > 0 && (
              <div className="pt-44 px-4">
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-3">
                    {conversations
                      .filter(c => c.otherUser && onlineUsers.includes(c.otherUser.id))
                      .map(conv => (
                        <motion.button
                          key={conv.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedConversationId(conv.id)}
                          className="flex flex-col items-center gap-1.5 min-w-[60px]"
                        >
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-muted overflow-hidden ring-2 ring-primary/30">
                              {conv.otherUser?.avatar_url ? (
                                <img
                                  src={conv.otherUser.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  {conv.otherUser?.display_name?.[0]?.toUpperCase() || "?"}
                                </div>
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                            {conv.otherUser?.display_name?.split(" ")[0] || "Usuário"}
                          </span>
                        </motion.button>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Conversations List */}
            <ScrollArea className={`flex-1 ${stats.online > 0 ? "" : "pt-44"}`}>
              <div className="px-4 pb-24">
                {messagesLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      {searchQuery ? (
                        <Search className="w-10 h-10 text-muted-foreground" />
                      ) : (
                        <MessageCircle className="w-10 h-10 text-primary" />
                      )}
                    </div>
                    <p className="text-xl font-semibold mb-2">
                      {searchQuery ? "Nenhum resultado" : "Nenhuma conversa"}
                    </p>
                    <p className="text-muted-foreground mb-6 max-w-[280px]">
                      {searchQuery
                        ? "Tente buscar por outro nome"
                        : "Inicie uma conversa com alguém"}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => setShowNewConversation(true)}
                        className="rounded-full gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Conversa
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-1">
                    {/* Unread Section */}
                    {filteredConversations.some(c => c.unreadCount > 0) && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                          NÃO LIDAS
                        </p>
                        {filteredConversations
                          .filter(c => c.unreadCount > 0)
                          .map((conversation, index) => (
                            <motion.div
                              key={conversation.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
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

                    {/* Read Section */}
                    {filteredConversations.some(c => c.unreadCount === 0) && (
                      <div>
                        {filteredConversations.some(c => c.unreadCount > 0) && (
                          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                            TODAS
                          </p>
                        )}
                        {filteredConversations
                          .filter(c => c.unreadCount === 0)
                          .map((conversation, index) => (
                            <motion.div
                              key={conversation.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                            >
                              <ChatPreview
                                id={conversation.id}
                                displayName={conversation.otherUser?.display_name || null}
                                username={conversation.otherUser?.username || null}
                                avatarUrl={conversation.otherUser?.avatar_url || null}
                                lastMessage={conversation.lastMessage?.content || null}
                                lastMessageTime={conversation.lastMessage?.created_at || conversation.updated_at}
                                unreadCount={0}
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
                )}
              </div>
            </ScrollArea>

            {/* FAB */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewConversation(true)}
              className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-30"
            >
              <Plus className="w-6 h-6" />
            </motion.button>

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
