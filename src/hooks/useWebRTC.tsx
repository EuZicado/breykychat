import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  CallSession, 
  CallSignal, 
  CallMessage, 
  CallParticipant, 
  ActiveCall, 
  IncomingCall,
  ICE_SERVERS,
  CallType,
  SignalType,
  CallStats,
  ConnectionQuality,
  DEFAULT_CONSTRAINTS
} from "@/types/calls";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Json } from "@/integrations/supabase/types";

// Helper to safely convert data to RTCSessionDescriptionInit
const toRTCSessionDescription = (data: Json): RTCSessionDescriptionInit => {
  const obj = data as Record<string, unknown>;
  return {
    type: obj.type as RTCSdpType,
    sdp: obj.sdp as string,
  };
};

// Helper to safely convert data to RTCIceCandidateInit
const toRTCIceCandidate = (data: Json): RTCIceCandidateInit => {
  const obj = data as Record<string, unknown>;
  return {
    candidate: obj.candidate as string,
    sdpMid: obj.sdpMid as string | null,
    sdpMLineIndex: obj.sdpMLineIndex as number | null,
    usernameFragment: obj.usernameFragment as string | null,
  };
};

export const useWebRTC = () => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Clean up function
  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    recordedChunksRef.current = [];
    setActiveCall(null);
    setCallMessages([]);
    setIsConnecting(false);
  }, []);

  // Get user media
  const getUserMedia = useCallback(async (
    callType: CallType, 
    deviceId?: { video?: string; audio?: string }
  ): Promise<MediaStream> => {
    const audioConstraint: MediaTrackConstraints = {
      ...(DEFAULT_CONSTRAINTS.audio as MediaTrackConstraints),
      deviceId: deviceId?.audio ? { exact: deviceId.audio } : undefined
    };
    
    const videoConstraint: MediaTrackConstraints = {
      ...(DEFAULT_CONSTRAINTS.video as MediaTrackConstraints),
      deviceId: deviceId?.video ? { exact: deviceId.video } : undefined
    };
    
    const constraints: MediaStreamConstraints = {
      audio: deviceId?.audio ? audioConstraint : DEFAULT_CONSTRAINTS.audio,
      video: callType === 'video' ? (deviceId?.video ? videoConstraint : DEFAULT_CONSTRAINTS.video) : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw new Error('Não foi possível acessar câmera/microfone');
    }
  }, []);

  // Enumerate media devices
  const enumerateDevices = useCallback(async (): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(d => d.kind === 'videoinput'),
        microphones: devices.filter(d => d.kind === 'audioinput'),
        speakers: devices.filter(d => d.kind === 'audiooutput'),
      };
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }, []);

  // Insert call signal helper
  const insertCallSignal = useCallback(async (
    callId: string, 
    senderId: string, 
    signalType: SignalType, 
    signalData: unknown
  ) => {
    const { error } = await supabase.from('call_signals').insert({
      call_id: callId,
      sender_id: senderId,
      signal_type: signalType,
      signal_data: JSON.parse(JSON.stringify(signalData)) as Json,
    });
    return { error };
  }, []);

  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    if (!activeCall || !user) return;

    try {
      const newStream = await getUserMedia(activeCall.session.call_type, { video: deviceId });
      const videoTrack = newStream.getVideoTracks()[0];
      
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender && sender.track) {
          await sender.replaceTrack(videoTrack);
          // Stop old track
          const oldTracks = localStreamRef.current?.getVideoTracks() || [];
          oldTracks.forEach(track => track.stop());
          
          // Update local stream
          if (localStreamRef.current) {
            oldTracks.forEach(track => localStreamRef.current?.removeTrack(track));
            localStreamRef.current.addTrack(videoTrack);
          }
        }
      }

      await insertCallSignal(activeCall.session.id, user.id, 'camera-switch', { deviceId });
      setActiveCall(prev => prev ? { ...prev, selectedCameraDeviceId: deviceId } : null);
    } catch (error) {
      console.error('Error switching camera:', error);
      toast.error('Erro ao trocar câmera');
    }
  }, [activeCall, user, getUserMedia, insertCallSignal]);

  // Switch audio device
  const switchAudioDevice = useCallback(async (deviceId: string) => {
    if (!activeCall || !user) return;

    try {
      const newStream = await getUserMedia(activeCall.session.call_type, { audio: deviceId });
      const audioTrack = newStream.getAudioTracks()[0];
      
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
        if (sender && sender.track) {
          await sender.replaceTrack(audioTrack);
          // Stop old track
          const oldTracks = localStreamRef.current?.getAudioTracks() || [];
          oldTracks.forEach(track => track.stop());
          
          // Update local stream
          if (localStreamRef.current) {
            oldTracks.forEach(track => localStreamRef.current?.removeTrack(track));
            localStreamRef.current.addTrack(audioTrack);
          }
        }
      }

      await insertCallSignal(activeCall.session.id, user.id, 'audio-switch', { deviceId });
      setActiveCall(prev => prev ? { ...prev, selectedAudioDeviceId: deviceId } : null);
    } catch (error) {
      console.error('Error switching audio device:', error);
      toast.error('Erro ao trocar dispositivo de áudio');
    }
  }, [activeCall, user, getUserMedia, insertCallSignal]);

  // Set volume
  const setVolume = useCallback((volume: number, isRemote: boolean = false) => {
    if (!localStreamRef.current) return;

    if (isRemote && activeCall?.remoteStream) {
      const audioTracks = activeCall.remoteStream.getAudioTracks();
      audioTracks.forEach(track => {
        const audioEl = document.querySelector('audio') as HTMLAudioElement;
        if (audioEl) {
          audioEl.volume = volume / 100;
        }
      });
      setActiveCall(prev => prev ? { ...prev, remoteVolume: volume } : null);
    } else {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        (track as any).volume = volume / 100;
      });
      setActiveCall(prev => prev ? { ...prev, localVolume: volume } : null);
    }
  }, [activeCall?.remoteStream]);

  // Insert call message helper
  const insertCallMessage = useCallback(async (callId: string, senderId: string, content: string) => {
    const { error } = await supabase.from('call_messages').insert({
      call_id: callId,
      sender_id: senderId,
      content,
    });
    return { error };
  }, []);

  // Send in-call message
  const sendCallMessage = useCallback(async (content: string) => {
    if (!activeCall || !user) return;
    await insertCallMessage(activeCall.session.id, user.id, content);
  }, [activeCall, user, insertCallMessage]);

  // Create peer connection
  const createPeerConnection = useCallback((callId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = async (event) => {
      if (event.candidate && user) {
        await insertCallSignal(callId, user.id, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setActiveCall(prev => prev ? { ...prev, remoteStream } : null);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        toast.error('Conexão perdida');
        endCall();
      }
    };

    // Connection quality monitoring
    const monitorQuality = () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      
      statsIntervalRef.current = setInterval(async () => {
        if (!pc || pc.connectionState !== 'connected') return;
        
        try {
          const stats = await pc.getStats();
          let callStats: Partial<CallStats> = { timestamp: Date.now() };
          
          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              callStats.bytesReceived = report.bytesReceived;
              callStats.packetsReceived = report.packetsReceived;
              callStats.packetsLost = report.packetsLost;
              callStats.jitter = report.jitter;
              callStats.frameRate = report.framesPerSecond;
            } else if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              callStats.bytesReceived = report.bytesReceived;
              callStats.packetsReceived = report.packetsReceived;
              callStats.packetsLost = report.packetsLost;
              callStats.jitter = report.jitter;
            } else if (report.type === 'outbound-rtp') {
              callStats.bytesSent = report.bytesSent;
              callStats.packetsSent = report.packetsSent;
            } else if (report.type === 'candidate-pair' && report.nominated) {
              callStats.rtt = report.currentRoundTripTime * 1000;
            }
          });

          // Determine connection quality
          let quality: ConnectionQuality = 'excellent';
          if (callStats.packetsLost && callStats.packetsLost > 10) quality = 'poor';
          else if (callStats.packetsLost && callStats.packetsLost > 5) quality = 'fair';
          else if (callStats.jitter && callStats.jitter > 30) quality = 'fair';
          else if (callStats.rtt && callStats.rtt > 200) quality = 'fair';

          setActiveCall(prev => prev ? { 
            ...prev, 
            stats: callStats as CallStats,
            connectionQuality: quality 
          } : null);
        } catch (error) {
          console.warn('Error collecting stats:', error);
        }
      }, 2000);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        monitorQuality();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [user, insertCallSignal]);

  // End call
  const endCall = useCallback(async () => {
    if (!activeCall || !user) return;

    const endedAt = new Date();
    const startedAt = activeCall.session.started_at ? new Date(activeCall.session.started_at) : endedAt;
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    // Send hangup signal
    await insertCallSignal(activeCall.session.id, user.id, 'hangup', {});

    // Update session
    await supabase
      .from('call_sessions')
      .update({ 
        status: 'ended',
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', activeCall.session.id);

    cleanup();
  }, [activeCall, user, cleanup, insertCallSignal]);

  // Setup realtime signaling
  const setupSignaling = useCallback((callId: string) => {
    const channel = supabase
      .channel(`call:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          const signal = payload.new as { signal_type: string; signal_data: Json; sender_id: string };
          if (signal.sender_id === user?.id) return;

          const pc = peerConnectionRef.current;
          if (!pc) return;

          try {
            if (signal.signal_type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(toRTCSessionDescription(signal.signal_data)));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await insertCallSignal(callId, user!.id, 'answer', answer);
            } else if (signal.signal_type === 'answer') {
              await pc.setRemoteDescription(new RTCSessionDescription(toRTCSessionDescription(signal.signal_data)));
            } else if (signal.signal_type === 'ice-candidate') {
              await pc.addIceCandidate(new RTCIceCandidate(toRTCIceCandidate(signal.signal_data)));
            } else if (signal.signal_type === 'hangup') {
              toast.info('Chamada encerrada');
              cleanup();
            } else if (signal.signal_type === 'recording-start') {
              toast.info('Participante começou a gravar');
            } else if (signal.signal_type === 'recording-stop') {
              toast.info('Participante parou de gravar');
            } else if (signal.signal_type === 'camera-switch') {
              // Handle remote camera switch notification
              console.log('Remote participant switched camera');
            } else if (signal.signal_type === 'audio-switch') {
              // Handle remote audio switch notification
              console.log('Remote participant switched audio device');
            } else if (signal.signal_type === 'volume-control') {
              // Handle remote volume control
              const data = signal.signal_data as { volume: number };
              setVolume(data.volume, true);
            }
          } catch (error) {
            console.error('Error handling signal:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_messages',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          const message = payload.new as CallMessage;
          setCallMessages(prev => [...prev, message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          const session = payload.new as CallSession;
          if (session.status === 'ended' || session.status === 'declined') {
            toast.info(session.status === 'declined' ? 'Chamada recusada' : 'Chamada encerrada');
            cleanup();
          }
          setActiveCall(prev => prev ? { ...prev, session } : null);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [user, cleanup, insertCallSignal]);

  // Start a call
  const startCall = useCallback(async (
    conversationId: string, 
    calleeId: string, 
    callType: CallType
  ): Promise<void> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsConnecting(true);

    try {
      // Enumerate devices first
      const devices = await enumerateDevices();
      
      // Get user media first
      const stream = await getUserMedia(callType);

      // Create call session
      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          conversation_id: conversationId,
          caller_id: user.id,
          callee_id: calleeId,
          call_type: callType,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;

      // Get callee info
      const { data: callee } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', calleeId)
        .single();

      // Create peer connection
      const pc = createPeerConnection(session.id);

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Setup signaling
      setupSignaling(session.id);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await insertCallSignal(session.id, user.id, 'offer', offer);

      setActiveCall({
        session: {
          ...session,
          call_type: session.call_type as CallType,
          status: session.status as CallSession['status'],
        },
        localStream: stream,
        remoteStream: null,
        screenStream: null,
        isAudioEnabled: true,
        isVideoEnabled: callType === 'video',
        isScreenSharing: false,
        isRecording: false,
        localVolume: 100,
        remoteVolume: 100,
        selectedCameraDeviceId: devices.cameras[0]?.deviceId || null,
        selectedAudioDeviceId: devices.microphones[0]?.deviceId || null,
        selectedOutputDeviceId: devices.speakers[0]?.deviceId || null,
        availableCameras: devices.cameras,
        availableMicrophones: devices.microphones,
        availableSpeakers: devices.speakers,
        connectionQuality: 'excellent',
        stats: null,
        otherParticipant: callee as CallParticipant,
      });

      setIsConnecting(false);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Erro ao iniciar chamada');
      cleanup();
    }
  }, [user, getUserMedia, enumerateDevices, createPeerConnection, setupSignaling, cleanup, insertCallSignal]);

  // Answer a call
  const answerCall = useCallback(async () => {
    if (!incomingCall || !user) return;

    setIsConnecting(true);

    try {
      // Enumerate devices
      const devices = await enumerateDevices();
      
      const stream = await getUserMedia(incomingCall.session.call_type);

      // Update call status
      await supabase
        .from('call_sessions')
        .update({ 
          status: 'connected',
          started_at: new Date().toISOString(),
        })
        .eq('id', incomingCall.session.id);

      // Create peer connection
      const pc = createPeerConnection(incomingCall.session.id);

      // Add tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Setup signaling
      setupSignaling(incomingCall.session.id);

      // Get the offer
      const { data: signals } = await supabase
        .from('call_signals')
        .select('*')
        .eq('call_id', incomingCall.session.id)
        .eq('signal_type', 'offer')
        .order('created_at', { ascending: false })
        .limit(1);

      if (signals && signals.length > 0) {
        const offerSignal = signals[0];
        await pc.setRemoteDescription(new RTCSessionDescription(toRTCSessionDescription(offerSignal.signal_data)));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await insertCallSignal(incomingCall.session.id, user.id, 'answer', answer);
      }

      setActiveCall({
        session: { ...incomingCall.session, status: 'connected' },
        localStream: stream,
        remoteStream: null,
        screenStream: null,
        isAudioEnabled: true,
        isVideoEnabled: incomingCall.session.call_type === 'video',
        isScreenSharing: false,
        isRecording: false,
        localVolume: 100,
        remoteVolume: 100,
        selectedCameraDeviceId: devices.cameras[0]?.deviceId || null,
        selectedAudioDeviceId: devices.microphones[0]?.deviceId || null,
        selectedOutputDeviceId: devices.speakers[0]?.deviceId || null,
        availableCameras: devices.cameras,
        availableMicrophones: devices.microphones,
        availableSpeakers: devices.speakers,
        connectionQuality: 'excellent',
        stats: null,
        otherParticipant: incomingCall.caller,
      });

      setIncomingCall(null);
      setIsConnecting(false);
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Erro ao atender chamada');
      cleanup();
    }
  }, [incomingCall, user, getUserMedia, enumerateDevices, createPeerConnection, setupSignaling, cleanup, insertCallSignal]);

  // Decline a call
  const declineCall = useCallback(async () => {
    if (!incomingCall) return;

    await supabase
      .from('call_sessions')
      .update({ status: 'declined' })
      .eq('id', incomingCall.session.id);

    setIncomingCall(null);
  }, [incomingCall]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setActiveCall(prev => prev ? { ...prev, isAudioEnabled: audioTrack.enabled } : null);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setActiveCall(prev => prev ? { ...prev, isVideoEnabled: videoTrack.enabled } : null);
    }
  }, []);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (!activeCall || !peerConnectionRef.current || !user) return;

    if (activeCall.isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      // Replace with camera track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
      }

      await insertCallSignal(activeCall.session.id, user.id, 'screen-share-stop', {});
      setActiveCall(prev => prev ? { ...prev, isScreenSharing: false, screenStream: null } : null);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        await insertCallSignal(activeCall.session.id, user.id, 'screen-share-start', {});
        setActiveCall(prev => prev ? { ...prev, isScreenSharing: true, screenStream } : null);
      } catch (error) {
        console.error('Error starting screen share:', error);
        toast.error('Erro ao compartilhar tela');
      }
    }
  }, [activeCall, user, insertCallSignal]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (!activeCall || !user) return;

    try {
      if (activeCall.isRecording) {
        // Stop recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        await insertCallSignal(activeCall.session.id, user.id, 'recording-stop', {});
        setActiveCall(prev => prev ? { ...prev, isRecording: false } : null);
        
        // Save recording
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `call-recording-${new Date().toISOString()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          recordedChunksRef.current = [];
          toast.success('Gravação salva com sucesso!');
        }
      } else {
        // Start recording
        if (!localStreamRef.current) return;
        
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(localStreamRef.current, {
          mimeType: 'video/webm;codecs=vp9,opus'
        });
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        
        recorder.start(1000); // Collect data every second
        mediaRecorderRef.current = recorder;
        
        await insertCallSignal(activeCall.session.id, user.id, 'recording-start', {});
        setActiveCall(prev => prev ? { ...prev, isRecording: true } : null);
        toast.info('Gravação iniciada');
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      toast.error('Erro ao gravar chamada');
    }
  }, [activeCall, user, insertCallSignal]);

  // Add toggleRecording to return object
  return {
    activeCall,
    incomingCall,
    callMessages,
    isConnecting,
    startCall,
    answerCall,
    declineCall,
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
  };



  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const session = payload.new as { 
            id: string; 
            status: string; 
            caller_id: string; 
            callee_id: string;
            call_type: string;
            conversation_id: string;
            started_at: string | null;
            ended_at: string | null;
            duration_seconds: number | null;
            created_at: string;
          };
          
          if (session.status !== 'ringing') return;

          // Get caller info
          const { data: caller } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', session.caller_id)
            .single();

          if (caller) {
            setIncomingCall({
              session: {
                ...session,
                call_type: session.call_type as CallType,
                status: session.status as CallSession['status'],
              },
              caller: caller as CallParticipant,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    activeCall,
    incomingCall,
    callMessages,
    isConnecting,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendCallMessage,
    switchCamera,
    switchAudioDevice,
    setVolume,
    enumerateDevices,
  };
};
