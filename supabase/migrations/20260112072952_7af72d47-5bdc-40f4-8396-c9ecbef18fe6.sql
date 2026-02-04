-- Add audio_url column to messages table for voice messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;

-- Add duration_seconds column for audio messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER DEFAULT NULL;

-- Create audio-messages bucket for storing voice messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for audio messages
CREATE POLICY "Authenticated users can upload audio messages"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-messages');

CREATE POLICY "Anyone can view audio messages"
ON storage.objects
FOR SELECT
USING (bucket_id = 'audio-messages');

CREATE POLICY "Users can delete their own audio messages"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audio-messages' AND auth.uid()::text = (storage.foldername(name))[1]);