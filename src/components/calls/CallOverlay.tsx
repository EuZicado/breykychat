import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Monitor, 
  MessageSquare,
  Minimize2,
  Maximize2,
  Send,
  Volume2,
  VolumeX,
  Camera,
  MicIcon,
  Settings,
  Wifi,
  WifiOff,
  WifiLow,
  Circle,
  CircleDot,
  CircleDashed,
  Disc
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const CallOverlay = () => {
  const { user } = useAuth();
  const { 
    activeCall, 
    callMessages, 
    endCall, 
    toggleAudio, 
    toggleVideo, 
    toggleScreenShare,
    toggleRecording,
    sendCallMessage,
    switchCamera,
    switchAudioDevice,
    setVolume,
    enumerateDevices,
    isConnecting 
  } = useCall();
  
  const [showChat, setShowChat] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }>({ 
    cameras: [], 
    microphones: [], 
    speakers: [] 
  });
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update video refs when streams change
  useEffect(() => {
    if (localVideoRef.current && activeCall?.localStream) {
      localVideoRef.current.srcObject = activeCall.localStream;
    }
  }, [activeCall?.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && activeCall?.remoteStream) {
      remoteVideoRef.current.srcObject = activeCall.remoteStream;
    }
  }, [activeCall?.remoteStream]);

  // Call duration timer
  useEffect(() => {
    if (activeCall?.session.status === 'connected') {
      const interval = setInterval(() => {
        if (activeCall.session.started_at) {
          const started = new Date(activeCall.session.started_at).getTime();
          const now = Date.now();
          setCallDuration(Math.floor((now - started) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.session.status, activeCall?.session.started_at]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [callMessages]);

  // Load devices
  useEffect(() => {
    const loadDevices = async () => {
      const deviceList = await enumerateDevices();
      setDevices(deviceList);
    };
    loadDevices();
  }, [enumerateDevices]);

  if (!activeCall) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    await sendCallMessage(chatMessage.trim());
    setChatMessage("");
  };

  const isVideoCall = activeCall.session.call_type === 'video';

  const getConnectionQualityIcon = () => {
    switch (activeCall.connectionQuality) {
      case 'excellent': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good': return <Wifi className="w-4 h-4 text-blue-500" />;
      case 'fair': return <WifiLow className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <WifiOff className="w-4 h-4 text-red-500" />;
      default: return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-24 right-4 z-50"
      >
        <div className="relative">
          <div 
            className="w-32 h-32 rounded-2xl overflow-hidden bg-background/90 backdrop-blur-lg border border-white/10 shadow-2xl cursor-pointer"
            onClick={() => setIsMinimized(false)}
          >
            {isVideoCall && activeCall.remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={activeCall.otherParticipant?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(activeCall.otherParticipant?.display_name || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-0.5 rounded text-xs">
              {formatDuration(callDuration)}
            </div>
          </div>
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              endCall();
            }}
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        {/* Video/Avatar Area */}
        <div className="relative h-full w-full">
          {/* Remote Video or Avatar */}
          {isVideoCall && activeCall.remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20">
              <motion.div
                animate={{ 
                  scale: isConnecting ? [1, 1.1, 1] : 1,
                }}
                transition={{ 
                  repeat: isConnecting ? Infinity : 0, 
                  duration: 1.5 
                }}
              >
                <Avatar className="w-32 h-32 border-4 border-primary/20">
                  <AvatarImage src={activeCall.otherParticipant?.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl">
                    {(activeCall.otherParticipant?.display_name || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <h2 className="mt-6 text-2xl font-semibold">
                {activeCall.otherParticipant?.display_name || "Usuário"}
              </h2>
              <p className="text-muted-foreground mt-1">
                {isConnecting ? "Conectando..." : 
                 activeCall.session.status === 'ringing' ? "Chamando..." :
                 formatDuration(callDuration)}
              </p>
              
              {/* Audio visualizer when connected */}
              {activeCall.session.status === 'connected' && !isVideoCall && (
                <div className="flex items-center gap-1 mt-8">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{
                        height: [12, 32, 12],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Local Video (PiP) */}
          {isVideoCall && activeCall.localStream && (
            <motion.div
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              className="absolute top-20 right-4 w-32 h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!activeCall.isVideoEnabled && (
                <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          )}

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 safe-top bg-gradient-to-b from-background/80 to-transparent">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <p className="font-medium">{activeCall.otherParticipant?.display_name}</p>
                <div className="flex items-center gap-2 justify-center">
                  <p className="text-xs text-muted-foreground">
                    {activeCall.session.status === 'connected' ? formatDuration(callDuration) : activeCall.session.call_type === 'video' ? 'Videochamada' : 'Chamada de voz'}
                  </p>
                  {activeCall.session.status === 'connected' && (
                    <span className="flex items-center">
                      {getConnectionQualityIcon()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Popover open={showSettings} onOpenChange={setShowSettings}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Configurações da Chamada</h4>
                                
                      {/* Volume Controls */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Volume Local</span>
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <Slider 
                          value={[activeCall.localVolume]} 
                          onValueChange={([value]) => setVolume(value, false)} 
                          max={100} 
                          step={1} 
                        />
                      </div>
                                
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Volume Remoto</span>
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <Slider 
                          value={[activeCall.remoteVolume]} 
                          onValueChange={([value]) => setVolume(value, true)} 
                          max={100} 
                          step={1} 
                        />
                      </div>
                                
                      {/* Device Selection */}
                      {isVideoCall && devices.cameras.length > 1 && (
                        <div className="space-y-2">
                          <span className="text-sm">Câmera</span>
                          <Select 
                            value={activeCall.selectedCameraDeviceId || ''} 
                            onValueChange={switchCamera}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar câmera" />
                            </SelectTrigger>
                            <SelectContent>
                              {devices.cameras.map(device => (
                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Câmera ${device.deviceId.substring(0, 8)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                                
                      {devices.microphones.length > 1 && (
                        <div className="space-y-2">
                          <span className="text-sm">Microfone</span>
                          <Select 
                            value={activeCall.selectedAudioDeviceId || ''} 
                            onValueChange={switchAudioDevice}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar microfone" />
                            </SelectTrigger>
                            <SelectContent>
                              {devices.microphones.map(device => (
                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Microfone ${device.deviceId.substring(0, 8)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                                
                      {/* Stats */}
                      {activeCall.stats && (
                        <div className="pt-2 border-t">
                          <h5 className="text-sm font-medium mb-2">Estatísticas</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>Pacotes perdidos: {activeCall.stats.packetsLost}</div>
                            <div>Jitter: {activeCall.stats.jitter?.toFixed(2)}ms</div>
                            <div>Latência: {activeCall.stats.rtt?.toFixed(0)}ms</div>
                            {activeCall.stats.videoResolution && (
                              <div>Resolução: {activeCall.stats.videoResolution.width}×{activeCall.stats.videoResolution.height}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                          
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare className={cn("w-5 h-5", showChat && "text-primary")} />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Drawer */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="absolute right-0 top-0 bottom-0 w-80 bg-background/95 backdrop-blur-lg border-l border-white/10 flex flex-col"
              >
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold">Chat da chamada</h3>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {callMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma mensagem ainda
                      </p>
                    ) : (
                      callMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "max-w-[80%] p-3 rounded-2xl",
                            msg.sender_id === user?.id
                              ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Mensagem..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!chatMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 safe-bottom bg-gradient-to-t from-background/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleAudio}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  activeCall.isAudioEnabled 
                    ? "bg-muted/50 hover:bg-muted" 
                    : "bg-destructive/20 text-destructive"
                )}
              >
                {activeCall.isAudioEnabled ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </motion.button>

              {isVideoCall && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleVideo}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                    activeCall.isVideoEnabled 
                      ? "bg-muted/50 hover:bg-muted" 
                      : "bg-destructive/20 text-destructive"
                  )}
                >
                  {activeCall.isVideoEnabled ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <VideoOff className="w-6 h-6" />
                  )}
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center"
              >
                <PhoneOff className="w-7 h-7 text-destructive-foreground" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleScreenShare}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  activeCall.isScreenSharing 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                <Monitor className="w-6 h-6" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleRecording}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  activeCall.isRecording 
                    ? "bg-red-500/20 text-red-500 animate-pulse" 
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                {activeCall.isRecording ? (
                  <Disc className="w-6 h-6" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
