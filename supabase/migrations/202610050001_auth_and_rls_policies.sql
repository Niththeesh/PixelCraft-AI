-- ============================================================================
-- Migration: 20261005000001_auth_and_rls_policies.sql
-- Description: Implement Row Level Security (RLS) policies for user-specific
--              conversation and message ownership via Supabase Auth (auth.uid()).
-- ============================================================================

-- 1. Ensure RLS is active on both tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to ensure idempotency
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view messages from own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON public.messages;

-- ============================================================================
-- 3. Row Level Security Policies for public.conversations
-- ============================================================================

-- SELECT: Authenticated users can only read their own conversations
CREATE POLICY "Users can view own conversations"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- INSERT: Authenticated users can only create conversations assigned to their user_id
CREATE POLICY "Users can insert own conversations"
    ON public.conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Authenticated users can only update their own conversations
CREATE POLICY "Users can update own conversations"
    ON public.conversations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Authenticated users can only delete their own conversations
CREATE POLICY "Users can delete own conversations"
    ON public.conversations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Row Level Security Policies for public.messages
-- ============================================================================

-- SELECT: Authenticated users can only read messages from conversations they own
CREATE POLICY "Users can view messages from own conversations"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = public.messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

-- INSERT: Authenticated users can only insert messages into conversations they own
CREATE POLICY "Users can insert messages to own conversations"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = public.messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

-- UPDATE: Authenticated users can only update messages in conversations they own
CREATE POLICY "Users can update messages in own conversations"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = public.messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = public.messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

-- DELETE: Authenticated users can only delete messages in conversations they own
CREATE POLICY "Users can delete messages in own conversations"
    ON public.messages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = public.messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );
