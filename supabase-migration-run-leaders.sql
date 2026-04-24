-- Migration: add run leader fields to members table
-- Run this in the Supabase SQL editor before deploying the matching code change.
--
-- is_run_leader  — toggled on by admins in the Members admin area
-- uka_number     — UK Athletics licence number (run leaders only)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_run_leader boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uka_number    text;
