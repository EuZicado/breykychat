-- First, let's drop ALL existing policies on conversations table to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on conversation_participants table
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversation_participants' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_participants', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS POLICIES

-- SELECT: Users can view conversations they participate in
CREATE POLICY "conversations_select_policy"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
);

-- INSERT: Any authenticated user can create a conversation
CREATE POLICY "conversations_insert_policy"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Users can update conversations they participate in
CREATE POLICY "conversations_update_policy"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
);

-- DELETE: Users can delete conversations they participate in
CREATE POLICY "conversations_delete_policy"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
);

-- CONVERSATION_PARTICIPANTS POLICIES

-- SELECT: Users can view participants of their conversations
CREATE POLICY "participants_select_policy"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- INSERT: Any authenticated user can add participants to any conversation
-- (Needed because the user creating the conversation hasn't been added yet)
CREATE POLICY "participants_insert_policy"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE: Users can only remove themselves from a conversation
CREATE POLICY "participants_delete_policy"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());