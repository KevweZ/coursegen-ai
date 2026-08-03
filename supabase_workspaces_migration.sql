-- ─────────────────────────────────────────────────────────────────────────────
-- NexCourse AI — Team workspaces & seats
-- Run ONCE in Supabase → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspaces (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text          NOT NULL DEFAULT 'Team Workspace',
  owner_user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat_limit          integer       NOT NULL DEFAULT 5
                                      CHECK (seat_limit >= 1 AND seat_limit <= 50),
  credits_ai          integer       NOT NULL DEFAULT 0,
  credits_tts         integer       NOT NULL DEFAULT 0,
  stripe_customer_id  text,
  stripe_sub_id       text,
  status              text          NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active', 'cancelled')),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_owner_unique UNIQUE (owner_user_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id         uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  email           text          NOT NULL,
  role            text          NOT NULL DEFAULT 'member'
                                  CHECK (role IN ('owner', 'member')),
  status          text          NOT NULL DEFAULT 'invited'
                                  CHECK (status IN ('active', 'invited', 'removed')),
  invite_token    text          UNIQUE,
  invited_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  joined_at       timestamptz,
  CONSTRAINT workspace_members_workspace_email UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON public.workspace_members(email);
CREATE INDEX IF NOT EXISTS idx_workspace_members_token ON public.workspace_members(invite_token);

-- Optional: shared Team drafts (nullable = personal Creator drafts)
ALTER TABLE public.course_drafts
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_drafts_workspace ON public.course_drafts(workspace_id);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can read their workspace
DROP POLICY IF EXISTS "Members read workspace" ON public.workspaces;
CREATE POLICY "Members read workspace"
  ON public.workspaces FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspaces.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Members read membership" ON public.workspace_members;
CREATE POLICY "Members read membership"
  ON public.workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.owner_user_id = auth.uid()
    )
  );

-- Server uses service role for invite/accept/credit writes (bypasses RLS)

-- Shared Team drafts: members can read/write drafts tagged with their workspace_id
DROP POLICY IF EXISTS "Users select own drafts" ON public.course_drafts;
CREATE POLICY "Users select own or workspace drafts"
  ON public.course_drafts FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = course_drafts.workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Users insert own drafts" ON public.course_drafts;
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
    )
  );

DROP POLICY IF EXISTS "Users update own drafts" ON public.course_drafts;
CREATE POLICY "Users update own or workspace drafts"
  ON public.course_drafts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = course_drafts.workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = course_drafts.workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Users delete own drafts" ON public.course_drafts;
CREATE POLICY "Users delete own or workspace drafts"
  ON public.course_drafts FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = course_drafts.workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
    )
  );
