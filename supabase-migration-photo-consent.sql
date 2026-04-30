-- ================================================================
-- radcliffe.run — Photo consent migration
-- Run in Supabase SQL Editor before deploying this code change.
-- ================================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS photo_consent boolean NOT NULL DEFAULT false;
