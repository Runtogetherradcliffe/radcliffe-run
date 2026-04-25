-- ================================================================
-- radcliffe.run — Email opt-out migration
-- Run in Supabase SQL Editor
-- ================================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;
