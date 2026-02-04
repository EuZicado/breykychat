import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, Volume2, VolumeX, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "@/contexts/CallContext";
import { useEffect, useRef, useState } from "react";

export const IncomingCallModal = () => {
  const { incomingCall, answerCall, declineCall, isConnecting } = useCall();
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const [ringDuration, setRingDuration] = useState(0);
  const [isSilent, setIsSilent] = useState(false);

  // Play ringtone
  useEffect(() => {
    if (incomingCall && !isSilent) {
      // Create oscillator for ringtone
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;

      let isPlaying = true;
      
      const playRing = () => {
        if (!isPlaying) return;
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(480, audioContext.currentTime + 0.2);
        setTimeout(() => {
          if (isPlaying) playRing();
        }, 1000);
      };

      oscillator.start();
      playRing();

      return () => {
        isPlaying = false;
        oscillator.stop();
        audioContext.close();
      };
    }
  }, [incomingCall, isSilent]);

  // Ring duration timer
  useEffect(() => {
    if (incomingCall) {
      const interval = setInterval(() => {
        setRingDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    setRingDuration(0);
  }, [incomingCall]);

  if (!incomingCall) return null;

  const isVideoCall = incomingCall.session.call_type === 'video';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
      >
        {/* Caller Info */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center"
        >
          {/* Animated ring around avatar */}
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.3,
              }}
            />
            <Avatar className="w-32 h-32 border-4 border-primary/30">
              <AvatarImage src={incomingCall.caller.avatar_url || undefined} />
              <AvatarFallback className="text-4xl">
                {(incomingCall.caller.display_name || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="mt-8 text-2xl font-bold">
            {incomingCall.caller.display_name || incomingCall.caller.username}
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              {isVideoCall ? (
                <>
                  <Video className="w-4 h-4" />
                  <span>Videochamada recebida</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Chamada de voz recebida</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-3 h-3" />
              <span>{ringDuration}s</span>
            </div>
          </div>
        </motion.div>

        {/* Call Actions */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12 flex items-center gap-6"
        >
          {/* Silent Mode */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSilent(!isSilent)}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"
            >
              {isSilent ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </motion.button>
            <span className="text-xs text-muted-foreground">Silenciar</span>
          </div>

          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={declineCall}
              className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/30"
            >
              <PhoneOff className="w-7 h-7 text-destructive-foreground" />
            </motion.button>
            <span className="text-sm text-muted-foreground">Recusar</span>
          </div>

          {/* Answer */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={answerCall}
              disabled={isConnecting}
              className="w-16 h-16 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/30"
            >
              {isVideoCall ? (
                <Video className="w-7 h-7 text-success-foreground" />
              ) : (
                <Phone className="w-7 h-7 text-success-foreground" />
              )}
            </motion.button>
            <span className="text-sm text-muted-foreground">
              {isConnecting ? "Conectando..." : "Atender"}
            </span>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
        >
          <p className="text-sm text-muted-foreground mb-2">
            Toque em um botão para responder
          </p>
          {isSilent && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <VolumeX className="w-3 h-3" />
              <span>Som silenciado</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
