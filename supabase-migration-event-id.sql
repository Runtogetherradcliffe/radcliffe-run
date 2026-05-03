-- Add Google Calendar Event ID to runs for stable sync matching
-- Run this in Supabase SQL Editor before deploying the updated sync route

ALTER TABLE runs ADD COLUMN IF NOT EXISTS google_event_id text;

-- Partial unique index: enforces uniqueness only for non-null values
-- (existing rows without an event ID can coexist without conflict)
CREATE UNIQUE INDEX IF NOT EXISTS runs_google_event_id_idx
  ON runs (google_event_id)
  WHERE google_event_id IS NOT NULL;
