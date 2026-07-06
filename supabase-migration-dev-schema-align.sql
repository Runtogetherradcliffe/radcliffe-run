-- ============================================================================
-- DEV SCHEMA ALIGNMENT - applied to the DEV project (rnbiqxhlqjbahgiwabuv)
-- on 6 Jul 2026. Production (qpdymxagloeghypntpct) is the source of truth and
-- was NOT changed.
--
-- WHY: the first live run of the new drift detector (scripts/db-diff.mjs, see
-- tests/access/README.md) found 14 schema-level differences that the 5 Jul
-- RLS/table reconciliation did not cover: column nullability, defaults and
-- types, plus two constraint/index differences. RLS policies, tables and
-- RLS-enabled flags already matched and are untouched here.
--
-- Notable: dev's runs.terrain check allowed 'mixed' but production's does NOT.
-- Two dev rows (the 29 Oct 2026 Halloween run, a trail route) carried
-- terrain='mixed' and were re-pointed to 'trail' before tightening the check.
-- The app code (runs sync normalise(), lib/database.types.ts, lib/buildEmail.ts)
-- still recognises 'mixed'; per the decision of 6 Jul 2026 'mixed' should not
-- exist as a value, so a sheet row marked "Mixed" will now fail the sync in
-- BOTH environments identically (previously it failed only on production).
--
-- This file is the versioned record of what was applied (via the Supabase
-- MCP migration dev_schema_align_to_prod). Re-running it against dev is not
-- needed; running it against production would fail (constraints already exist).
-- ============================================================================
begin;

-- Data fix first: dev carried 2 rows with terrain='mixed' (Halloween run,
-- a trail route). Prod's check constraint does not allow 'mixed'.
update public.runs set terrain = 'trail' where terrain = 'mixed';

-- runs.terrain check: prod allows road/trail only (no 'mixed')
alter table public.runs drop constraint runs_terrain_check;
alter table public.runs add constraint runs_terrain_check
  check (terrain = any (array['road'::text, 'trail'::text]));

-- NOT NULL alignments (prod stricter than dev; verified no NULLs in dev data)
alter table public.runs alter column on_tour set not null;
alter table public.runs alter column has_jeffing set not null;
alter table public.runs alter column run_type set not null;
alter table public.push_subscriptions alter column created_at set not null;
alter table public.site_settings alter column c25k_enabled set not null;
alter table public.site_settings alter column c25k_registration_open set not null;

-- Defaults: prod defaults the emergency-contact fields to ''
alter table public.members alter column emergency_name set default ''::text;
alter table public.members alter column emergency_phone set default ''::text;
alter table public.members alter column emergency_relationship set default ''::text;

-- Type alignments
alter table public.runs alter column distance_km type numeric;
alter table public.site_settings alter column c25k_start_date type text
  using c25k_start_date::text;

-- Prod has an additional plain UNIQUE constraint on google_event_id
-- (alongside the partial unique index both projects share)
alter table public.runs add constraint runs_google_event_id_key
  unique (google_event_id);

commit;
