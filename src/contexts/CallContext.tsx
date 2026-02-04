import { createContext, useContext, ReactNode } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { ActiveCall, IncomingCall, CallMessage, CallType } from "@/types/calls";

interface CallContextType {
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  callMessages: CallMessage[];
  isConnecting: boolean;
  startCall: (conversationId: string, calleeId: string, callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleRecording?: () => Promise<void>;
  sendCallMessage: (content: string) => Promise<void>;
  switchCamera?: (deviceId: string) => Promise<void>;
  switchAudioDevice?: (deviceId: string) => Promise<void>;
  setVolume?: (volume: number, isRemote?: boolean) => void;
  enumerateDevices?: () => Promise<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }>;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const webRTC = useWebRTC();

  return (
    <CallContext.Provider value={webRTC}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};
