-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

-- Create security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can update message read status"
ON public.messages
FOR UPDATE
USING (public.is_conversation_participant(conversation_id, auth.uid()));