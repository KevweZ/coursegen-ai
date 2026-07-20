-- ─────────────────────────────────────────────────────────────────────────────
-- NexCourse AI — user_entitlements table
-- Run this ONE TIME in your Supabase project:
--   supabase.com → your project → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription        text          NOT NULL DEFAULT 'free'
                                      CHECK (subscription IN ('free','teacher_pro','pro_creator','business_team')),
  credits_ai          integer       NOT NULL DEFAULT 0,
  credits_tts         integer       NOT NULL DEFAULT 0,
  stripe_customer_id  text,
  stripe_sub_id       text,
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT user_entitlements_user_id_unique UNIQUE (user_id)
);

-- Row-Level Security: users can only read their own row
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entitlements"
  ON public.user_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

-- The server (Render) uses the service key which bypasses RLS — no INSERT policy needed
-- but add one for completeness (service key will upsert via admin client):
CREATE POLICY "Service role can manage all entitlements"
  ON public.user_entitlements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);

-- Index for webhook lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_customer ON public.user_entitlements(stripe_customer_id);
