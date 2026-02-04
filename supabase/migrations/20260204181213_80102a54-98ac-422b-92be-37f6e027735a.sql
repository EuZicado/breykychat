-- Create table for WebRTC call signaling
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'connected', 'ended', 'missed', 'declined')),
  call_type TEXT NOT NULL DEFAULT 'audio' CHECK (call_type IN ('audio', 'video')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for WebRTC signaling messages (offers, answers, ICE candidates)
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'hangup', 'screen-share-start', 'screen-share-stop')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for in-call messages
CREATE TABLE public.call_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_sessions
CREATE POLICY "Users can view their calls"
  ON public.call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls"
  ON public.call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update calls"
  ON public.call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- RLS policies for call_signals
CREATE POLICY "Participants can view signals"
  ON public.call_signals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.call_sessions 
    WHERE id = call_signals.call_id 
    AND (caller_id = auth.uid() OR callee_id = auth.uid())
  ));

CREATE POLICY "Participants can send signals"
  ON public.call_signals FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.call_sessions 
      WHERE id = call_signals.call_id 
      AND (caller_id = auth.uid() OR callee_id = auth.uid())
    )
  );

-- RLS policies for call_messages
CREATE POLICY "Participants can view call messages"
  ON public.call_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.call_sessions 
    WHERE id = call_messages.call_id 
    AND (caller_id = auth.uid() OR callee_id = auth.uid())
  ));

CREATE POLICY "Participants can send call messages"
  ON public.call_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.call_sessions 
      WHERE id = call_messages.call_id 
      AND (caller_id = auth.uid() OR callee_id = auth.uid())
    )
  );

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_messages;

-- Indexes for performance
CREATE INDEX idx_call_sessions_conversation ON public.call_sessions(conversation_id);
CREATE INDEX idx_call_sessions_caller ON public.call_sessions(caller_id);
CREATE INDEX idx_call_sessions_callee ON public.call_sessions(callee_id);
CREATE INDEX idx_call_sessions_status ON public.call_sessions(status);
CREATE INDEX idx_call_signals_call ON public.call_signals(call_id);
CREATE INDEX idx_call_messages_call ON public.call_messages(call_id);