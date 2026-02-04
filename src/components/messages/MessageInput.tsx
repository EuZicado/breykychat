import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Image as ImageIcon, Loader2, Check, X, Sticker } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioRecorder } from "./AudioRecorder";
import { StickerPicker } from "./StickerPicker";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface MessageInputProps {
  onSend: (message: string, stickerUrl?: string) => Promise<void>;
  onSendAudio: (audioBlob: Blob, duration: number) => Promise<void>;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

type SendingState = "idle" | "sending" | "success" | "error";

export const MessageInput = ({
  onSend,
  onSendAudio,
  onTypingStart,
  onTypingStop,
  disabled,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [sendingState, setSendingState] = useState<SendingState>("idle");
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
    formatDuration,
  } = useAudioRecorder();

  const handleChange = (value: string) => {
    setMessage(value);

    if (value.trim()) {
      onTypingStart();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop();
      }, 2000);
    } else {
      onTypingStop();
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sendingState === "sending" || disabled) return;

    const messageToSend = message.trim();
    setMessage("");
    setSendingState("sending");
    onTypingStop();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await onSend(messageToSend);
      setSendingState("success");
      setTimeout(() => setSendingState("idle"), 1500);
    } catch (error) {
      setSendingState("error");
      setMessage(messageToSend);
      setTimeout(() => setSendingState("idle"), 2000);
    }
  };

  const handleSendSticker = async (stickerUrl: string) => {
    setSendingState("sending");
    try {
      await onSend("", stickerUrl);
      setSendingState("success");
      setTimeout(() => setSendingState("idle"), 1000);
    } catch (error) {
      setSendingState("error");
      setTimeout(() => setSendingState("idle"), 2000);
    }
  };

  const handleSendAudio = useCallback(async () => {
    if (!audioBlob) return;

    setIsSendingAudio(true);
    try {
      await onSendAudio(audioBlob, duration);
      clearRecording();
    } catch (error) {
      console.error("Error sending audio:", error);
    } finally {
      setIsSendingAudio(false);
    }
  }, [audioBlob, duration, onSendAudio, clearRecording]);

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, [startRecording]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getButtonContent = () => {
    switch (sendingState) {
      case "sending":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "success":
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Check className="w-4 h-4" />
          </motion.div>
        );
      case "error":
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <X className="w-4 h-4" />
          </motion.div>
        );
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  const getButtonVariant = () => {
    switch (sendingState) {
      case "success":
        return "bg-green-500 hover:bg-green-600";
      case "error":
        return "bg-destructive hover:bg-destructive/90";
      default:
        return "";
    }
  };

  const showAudioRecorder = isRecording || audioUrl;

  return (
    <>
      <div className="glass-strong border-t border-white/5 px-4 py-3 safe-bottom">
        {/* Error Message */}
        <AnimatePresence>
          {sendingState === "error" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2"
            >
              <p className="text-xs text-destructive text-center">
                Erro ao enviar. Toque para tentar novamente.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showAudioRecorder ? (
            <motion.div
              key="audio-recorder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <AudioRecorder
                isRecording={isRecording}
                duration={duration}
                audioUrl={audioUrl}
                isSending={isSendingAudio}
                formatDuration={formatDuration}
                onStartRecording={handleStartRecording}
                onStopRecording={stopRecording}
                onCancelRecording={cancelRecording}
                onSendAudio={handleSendAudio}
                disabled={disabled}
              />
            </motion.div>
          ) : (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2"
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowStickerPicker(true)}
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                disabled={disabled}
              >
                <Sticker className="w-5 h-5" />
              </motion.button>
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={disabled}
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <Input
                value={message}
                onChange={(e) => handleChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mensagem..."
                className={cn(
                  "flex-1 bg-muted/30 transition-all",
                  sendingState === "error" && "border-destructive/50"
                )}
                disabled={disabled || sendingState === "sending"}
              />

              {message.trim() || sendingState !== "idle" ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Button
                    size="icon"
                    variant="neon"
                    onClick={handleSend}
                    disabled={
                      (!message.trim() && sendingState === "idle") ||
                      sendingState === "sending" ||
                      disabled
                    }
                    className={cn("transition-all duration-300", getButtonVariant())}
                  >
                    {getButtonContent()}
                  </Button>
                </motion.div>
              ) : (
                <AudioRecorder
                  isRecording={false}
                  duration={0}
                  audioUrl={null}
                  isSending={false}
                  formatDuration={formatDuration}
                  onStartRecording={handleStartRecording}
                  onStopRecording={stopRecording}
                  onCancelRecording={cancelRecording}
                  onSendAudio={handleSendAudio}
                  disabled={disabled}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticker Picker */}
      <StickerPicker
        open={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleSendSticker}
      />
    </>
  );
};
