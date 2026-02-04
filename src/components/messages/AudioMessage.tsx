import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioMessageProps {
  audioUrl: string;
  duration?: number;
  isOwn: boolean;
}

export const AudioMessage = ({ audioUrl, duration, isOwn }: AudioMessageProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(Math.floor(audio.duration));
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.floor(audio.currentTime));
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || audioDuration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    audio.currentTime = clickPosition * audio.duration;
  };

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={togglePlayPause}
        disabled={isLoading}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
          isOwn
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-primary/20 hover:bg-primary/30"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </motion.button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Progress bar */}
        <div
          onClick={handleProgressClick}
          className={cn(
            "h-1.5 rounded-full cursor-pointer overflow-hidden",
            isOwn ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
          )}
        >
          <motion.div
            className={cn(
              "h-full rounded-full",
              isOwn ? "bg-primary-foreground/70" : "bg-primary/70"
            )}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Duration */}
        <span
          className={cn(
            "text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {isPlaying || currentTime > 0
            ? formatTime(currentTime)
            : formatTime(audioDuration)}
        </span>
      </div>
    </div>
  );
};
