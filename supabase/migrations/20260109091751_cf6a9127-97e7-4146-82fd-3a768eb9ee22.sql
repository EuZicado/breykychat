-- Drop and recreate the INSERT policy for conversations to allow authenticated users
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also ensure the conversation_participants INSERT policy works correctly
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to new conversations" 
ON public.conversation_participants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add policy to allow viewing own participation
DROP POLICY IF EXISTS "Users can view their own participation" ON public.conversation_participants;

CREATE POLICY "Users can view all participants in their conversations" 
ON public.conversation_participants 
FOR SELECT 
TO authenticated
USING (
  is_conversation_participant(conversation_id, auth.uid()) 
  OR user_id = auth.uid()
);