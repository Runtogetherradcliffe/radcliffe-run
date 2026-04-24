-- Migration: add show_social_calendar toggle to site_settings
-- Run this in the Supabase SQL editor before deploying the matching code change.
--
-- Controls whether the "Social runs →" calendar subscription button
-- is shown on the homepage. Defaults to false (hidden).
-- Toggle via Admin → Settings → "Social runs calendar button".

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS show_social_calendar boolean NOT NULL DEFAULT false;
