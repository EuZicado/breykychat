// Types for WebRTC calling system

export type CallStatus = 'pending' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined' | 'busy';
export type CallType = 'audio' | 'video';
export type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'screen-share-start' | 'screen-share-stop' | 'recording-start' | 'recording-stop' | 'volume-control' | 'camera-switch' | 'audio-switch';
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'saving';
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export interface CallSession {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  status: CallStatus;
  call_type: CallType;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface CallSignal {
  id: string;
  call_id: string;
  sender_id: string;
  signal_type: SignalType;
  signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
  created_at: string;
}

export interface CallMessage {
  id: string;
  call_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface CallParticipant {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ActiveCall {
  session: CallSession;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  localVolume: number; // 0-100
  remoteVolume: number; // 0-100
  selectedCameraDeviceId: string | null;
  selectedAudioDeviceId: string | null;
  selectedOutputDeviceId: string | null;
  availableCameras: MediaDeviceInfo[];
  availableMicrophones: MediaDeviceInfo[];
  availableSpeakers: MediaDeviceInfo[];
  connectionQuality: ConnectionQuality;
  stats: CallStats | null;
  otherParticipant: CallParticipant | null;
}

export interface IncomingCall {
  session: CallSession;
  caller: CallParticipant;
}

export interface CallStats {
  timestamp: number;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
  jitter: number;
  rtt: number;
  videoResolution?: { width: number; height: number };
  frameRate?: number;
  audioBitrate?: number;
  videoBitrate?: number;
}

export interface CallHistoryEntry {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  caller_display_name: string | null;
  caller_avatar_url: string | null;
  callee_display_name: string | null;
  callee_avatar_url: string | null;
}

// ICE Server configuration
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// Default constraints
export const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
};
