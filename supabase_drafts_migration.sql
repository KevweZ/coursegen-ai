-- ─────────────────────────────────────────────────────────────────────────────
-- NexCourse AI — Cloud course drafts
-- Run ONCE in Supabase → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_drafts (
  id              text          PRIMARY KEY,
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase           text          NOT NULL CHECK (phase IN ('design', 'preview')),
  course_title    text          NOT NULL DEFAULT 'Untitled Course',
  slide_count     integer       NOT NULL DEFAULT 0,
  module_count    integer       NOT NULL DEFAULT 0,
  theme           text          NOT NULL DEFAULT 'light',
  player_config   jsonb,
  snapshot        jsonb         NOT NULL,
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_drafts_user_id ON public.course_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_course_drafts_updated_at ON public.course_drafts(updated_at DESC);

ALTER TABLE public.course_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own drafts" ON public.course_drafts;
CREATE POLICY "Users select own drafts"
  ON public.course_drafts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own drafts" ON public.course_drafts;
CREATE POLICY "Users insert own drafts"
  ON public.course_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own drafts" ON public.course_drafts;
CREATE POLICY "Users update own drafts"
  ON public.course_drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own drafts" ON public.course_drafts;
CREATE POLICY "Users delete own drafts"
  ON public.course_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Private bucket for heavy media (data-URL JSON chunks)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('draft-assets', 'draft-assets', false, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Users read own draft assets" ON storage.objects;
CREATE POLICY "Users read own draft assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'draft-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users upload own draft assets" ON storage.objects;
CREATE POLICY "Users upload own draft assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'draft-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own draft assets" ON storage.objects;
CREATE POLICY "Users update own draft assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'draft-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own draft assets" ON storage.objects;
CREATE POLICY "Users delete own draft assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'draft-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
