-- Drop all existing policies on conversations and participants to start fresh
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_policy" ON public.conversations;
DROP POLICY IF EXISTS "participants_select_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_delete_policy" ON public.conversation_participants;

-- Also drop any legacy policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can add participants to new conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view all participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create a security definer function to create conversations safely
CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conv_id uuid;
  existing_conv_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Check for existing conversation between these users
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id AND cp2.user_id = other_user_id
  LIMIT 1;
  
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conv_id;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conv_id, current_user_id),
    (new_conv_id, other_user_id);
  
  RETURN new_conv_id;
END;
$$;

-- Now create PERMISSIVE policies for conversations
-- SELECT: Users can view conversations they participate in
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- INSERT: Handled by security definer function, but allow as fallback
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Users can update conversations they participate in
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- DELETE: Users can delete conversations they participate in
CREATE POLICY "Users can delete their conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- Policies for conversation_participants
-- SELECT: Users can view participants of their conversations
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- INSERT: Authenticated users can add participants (needed for conversation creation)
CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE: Users can remove themselves from conversations
CREATE POLICY "Users can leave conversations"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());