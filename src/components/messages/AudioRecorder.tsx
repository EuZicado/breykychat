import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  isRecording: boolean;
  duration: number;
  audioUrl: string | null;
  isSending: boolean;
  formatDuration: (seconds: number) => string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSendAudio: () => void;
  disabled?: boolean;
}

export const AudioRecorder = ({
  isRecording,
  duration,
  audioUrl,
  isSending,
  formatDuration,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSendAudio,
  disabled,
}: AudioRecorderProps) => {
  if (audioUrl) {
    // Preview mode - recorded audio ready to send
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex items-center gap-2 w-full"
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancelRecording}
          disabled={isSending}
          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>

        <div className="flex-1 bg-muted/50 rounded-full px-4 py-2">
          <audio src={audioUrl} controls className="w-full h-8" />
        </div>

        <Button
          size="icon"
          variant="neon"
          onClick={onSendAudio}
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </motion.div>
    );
  }

  if (isRecording) {
    // Recording mode
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex items-center gap-3 w-full"
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancelRecording}
          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>

        <div className="flex-1 flex items-center gap-3">
          {/* Recording indicator */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-3 h-3 rounded-full bg-destructive"
          />
          
          {/* Waveform visualization */}
          <div className="flex items-center gap-0.5 flex-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: [4, Math.random() * 20 + 4, 4],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.5,
                  delay: i * 0.05,
                }}
                className="w-1 bg-primary rounded-full"
                style={{ minHeight: 4 }}
              />
            ))}
          </div>

          {/* Duration */}
          <span className="text-sm font-mono text-muted-foreground min-w-[40px]">
            {formatDuration(duration)}
          </span>
        </div>

        <Button
          size="icon"
          variant="neon"
          onClick={onStopRecording}
          className="bg-destructive hover:bg-destructive/90"
        >
          <Square className="w-4 h-4 fill-current" />
        </Button>
      </motion.div>
    );
  }

  // Idle mode - mic button
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onStartRecording}
      disabled={disabled}
      className={cn(
        "p-2 text-muted-foreground hover:text-primary transition-colors rounded-full",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Mic className="w-5 h-5" />
    </motion.button>
  );
};
