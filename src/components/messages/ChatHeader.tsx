import { ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TypingIndicator } from "./TypingIndicator";
import { useCall } from "@/contexts/CallContext";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ChatHeaderProps {
  conversationId: string;
  otherUserId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  isTyping: boolean;
  onBack: () => void;
}

export const ChatHeader = ({
  conversationId,
  otherUserId,
  displayName,
  username,
  avatarUrl,
  isOnline,
  isTyping,
  onBack,
}: ChatHeaderProps) => {
  const { startCall, activeCall } = useCall();

  const handleVoiceCall = async () => {
    if (activeCall) {
      toast.error("Você já está em uma chamada");
      return;
    }
    await startCall(conversationId, otherUserId, "audio");
  };

  const handleVideoCall = async () => {
    if (activeCall) {
      toast.error("Você já está em uma chamada");
      return;
    }
    await startCall(conversationId, otherUserId, "video");
  };

  return (
    <header className="glass-strong border-b border-white/5 px-4 py-3 safe-top">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        
        <div className="relative">
          <Avatar className="w-10 h-10 ring-2 ring-background">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
              {(displayName || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background"
            />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{displayName || username || "Usuário"}</p>
          {isTyping ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-primary font-medium">Digitando</span>
              <TypingIndicator className="scale-75 origin-left" />
            </div>
          ) : isOnline ? (
            <p className="text-xs text-success font-medium">Online agora</p>
          ) : (
            <p className="text-xs text-muted-foreground">@{username || "unknown"}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleVoiceCall}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <Phone className="w-5 h-5 text-primary" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleVideoCall}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <Video className="w-5 h-5 text-primary" />
          </motion.button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Ver perfil</DropdownMenuItem>
              <DropdownMenuItem>Silenciar notificações</DropdownMenuItem>
              <DropdownMenuItem>Buscar na conversa</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Bloquear usuário</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
