-- Optional hardening: allow Team workspace OWNERS to insert/update drafts
-- (members-only checks previously excluded owners who aren't in workspace_members).
-- Run in Supabase SQL Editor if Team owners report draft save failures with a workspace_id.

DROP POLICY IF EXISTS "Users insert own or workspace drafts" ON public.course_drafts;
CREATE POLICY "Users insert own or workspace drafts"
  ON public.course_drafts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      workspace_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = course_drafts.workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = course_drafts.workspace_id
          AND w.owner_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users update own or workspace drafts" ON public.course_drafts;
CREATE POLICY "Users update own or workspace drafts"
  ON public.course_drafts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.workspace_members m
          WHERE m.workspace_id = course_drafts.workspace_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.workspaces w
          WHERE w.id = course_drafts.workspace_id
            AND w.owner_user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.workspace_members m
          WHERE m.workspace_id = course_drafts.workspace_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.workspaces w
          WHERE w.id = course_drafts.workspace_id
            AND w.owner_user_id = auth.uid()
        )
      )
    )
  );
