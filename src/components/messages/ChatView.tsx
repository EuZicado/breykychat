import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConversationMessages, useOtherParticipant } from "@/hooks/messages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { usePresence } from "@/hooks/usePresence";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { toast } from "sonner";

interface ChatViewProps {
  conversationId: string;
  onBack: () => void;
}

export const ChatView = ({ conversationId, onBack }: ChatViewProps) => {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, sendAudioMessage, markAsRead } =
    useConversationMessages(conversationId);
  const { otherUser } = useOtherParticipant(conversationId);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId);
  const { onlineUsers } = usePresence();
  const { toggleReaction, getReactionCounts } = useMessageReactions(conversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Scroll to bottom on new messages (only if user is at bottom)
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // Mark messages as read when viewing
  useEffect(() => {
    markAsRead();
  }, [messages, markAsRead]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (content: string, stickerUrl?: string) => {
      const result = await sendMessage(content, stickerUrl);

      if (!result.success) {
        toast.error(result.error || "Erro ao enviar mensagem");
        throw new Error(result.error);
      }
    },
    [sendMessage]
  );

  const handleSendAudio = useCallback(
    async (audioBlob: Blob, duration: number) => {
      const result = await sendAudioMessage(audioBlob, duration);

      if (!result.success) {
        toast.error(result.error || "Erro ao enviar áudio");
        throw new Error(result.error);
      }
    },
    [sendAudioMessage]
  );

  const isOtherUserTyping = otherUser ? typingUsers.includes(otherUser.id) : false;
  const isOtherUserOnline = otherUser ? onlineUsers.includes(otherUser.id) : false;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando conversa...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      <ChatHeader
        conversationId={conversationId}
        otherUserId={otherUser?.id || ""}
        displayName={otherUser?.display_name || null}
        username={otherUser?.username || null}
        avatarUrl={otherUser?.avatar_url || null}
        isOnline={isOtherUserOnline}
        isTyping={isOtherUserTyping}
        onBack={onBack}
      />

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-muted-foreground font-medium">Nenhuma mensagem ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Diga oi para {otherUser?.display_name || "este usuário"}!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showAvatar =
                !isOwn &&
                (index === messages.length - 1 ||
                  messages[index + 1]?.sender_id !== message.sender_id);

              const reactions = getReactionCounts(message.id);

              return (
                <MessageBubble
                  key={message.id}
                  messageId={message.id}
                  content={message.content}
                  stickerUrl={message.sticker_url}
                  audioUrl={message.audio_url}
                  audioDuration={message.audio_duration_seconds}
                  isOwn={isOwn}
                  isRead={message.is_read}
                  timestamp={message.created_at}
                  showAvatar={showAvatar}
                  avatarUrl={!isOwn ? otherUser?.avatar_url : undefined}
                  reactions={reactions}
                  onToggleReaction={toggleReaction}
                />
              );
            })}

            {/* Typing indicator */}
            {isOtherUserTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2"
              >
                {otherUser?.avatar_url && (
                  <img
                    src={otherUser.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageInput
        onSend={handleSendMessage}
        onSendAudio={handleSendAudio}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
      />
    </motion.div>
  );
};
