-- Add user settings column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS message_privacy text DEFAULT 'everyone' CHECK (message_privacy IN ('everyone', 'followers', 'nobody'));

-- Create typing_status table for typing indicators
CREATE TABLE IF NOT EXISTS public.typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing_status
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing_status
CREATE POLICY "Users can view typing status in their conversations"
ON public.typing_status FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can update their own typing status"
ON public.typing_status FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can update their typing status"
ON public.typing_status FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their typing status"
ON public.typing_status FOR DELETE
USING (user_id = auth.uid());

-- Create function to check if user can message another user
CREATE OR REPLACE FUNCTION public.can_send_message(sender_id uuid, receiver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privacy_setting text;
  is_follower boolean;
BEGIN
  -- Get receiver's message privacy setting
  SELECT message_privacy INTO privacy_setting
  FROM public.profiles
  WHERE id = receiver_id;
  
  -- Default to everyone if not set
  IF privacy_setting IS NULL THEN
    privacy_setting := 'everyone';
  END IF;
  
  -- Check based on privacy setting
  CASE privacy_setting
    WHEN 'nobody' THEN
      RETURN FALSE;
    WHEN 'followers' THEN
      -- Check if sender follows receiver
      SELECT EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = sender_id AND following_id = receiver_id
      ) INTO is_follower;
      RETURN is_follower;
    ELSE
      RETURN TRUE; -- 'everyone'
  END CASE;
END;
$$;

-- Enable realtime for typing_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;

-- Add read receipts - already exists via is_read column, just ensure realtime works
ALTER TABLE public.messages REPLICA IDENTITY FULL;