-- Weekly note on the app's Home (21 Jul 2026): a short line Paul edits weekly
-- (this week's route overview / club news), stored on the existing single-row
-- site_settings table like every other admin-edited setting. The timestamp is
-- stamped server-side by /api/admin/settings whenever the note's TEXT changes,
-- and /api/home serves the note only while it is under 7 days old - a stale
-- "this week" line is worse than silence, so the note self-expires.
-- Applied to dev AND production on 21 Jul 2026.
alter table site_settings
  add column if not exists weekly_note text,
  add column if not exists weekly_note_updated_at timestamptz;
