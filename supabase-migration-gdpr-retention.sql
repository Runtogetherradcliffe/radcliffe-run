-- GDPR data retention: add deactivated_at timestamp to members
-- Run this in the Supabase SQL Editor on BOTH dev and production projects.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
