-- Attendance recognition backend (10 Jul 2026) - the counting + milestone
-- layer over `attendance`. Decisions recorded in
-- docs/ATTENDANCE_RECOGNITION_BRIEF.md (decision record, 10 Jul 2026).
--
-- The model is parkrun's: two lifetime counters per member - RUN (turned up
-- and ran) and VOLUNTEER (led a group). Rungs at 10/25/50/75/100 then every
-- 25 (Paul, 12 Jul 2026; centuries stay the celebrated tier). The rung list
-- lives in lib/recognition.ts, not the DB (awards.rung is only CHECK rung >
-- 0), so this ladder change needs no migration. The unit is a NIGHT ATTENDED
-- (a distinct run date), never an
-- attendance row: 8k attendance is recorded against the 5k anchor row and
-- Jeffing has no row of its own, so counts MUST be COUNT(DISTINCT runs.date),
-- with runs.run_type IN ('regular','c25k') AND NOT cancelled. Socials and
-- walks never count. No per-group counting anywhere: attendance.group_key /
-- run_leadership.group_key are descriptive metadata only.
--
-- Apply to dev FIRST, production only after explicit approval, and BEFORE
-- deploying code that uses these tables.

-- ── attendance_seeds ────────────────────────────────────────────────────────
-- Era-1 offsets: lifetime credit earned before the new site's records begin.
--   kind='run'       source='oldsite_csv'   as_of 2026-04-30 (old-site export)
--   kind='volunteer' source='leader_polls'  as_of 2026-07-09 (WhatsApp polls)
--   source='manual' for by-exception adjustments (Paul adjudicates).
-- Lifetime count = seed(s) + count of distinct qualifying run dates. Seeds
-- exist ONLY for registered members (GDPR: unmatched people in the source
-- exports are never imported; the importer re-attaches them if they register
-- later). One row per (member, kind, source) keeps the import idempotent.
CREATE TABLE IF NOT EXISTS attendance_seeds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('run', 'volunteer')),
  count         integer NOT NULL CHECK (count >= 0),
  as_of         date NOT NULL,
  source        text NOT NULL CHECK (source IN ('oldsite_csv', 'leader_polls', 'manual')),
  source_detail text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, kind, source)
);

CREATE INDEX IF NOT EXISTS attendance_seeds_member_idx ON attendance_seeds(member_id);

-- ── run_leadership ──────────────────────────────────────────────────────────
-- Volunteer credit: "this leader was at this night as a leader". Written
-- AUTOMATICALLY by the check-in route when the member checked in has
-- is_run_leader (leading implies attending - revised model, 10 Jul 2026);
-- the rare "ran but didn't lead" night is an override handled by deleting
-- that night's row. Keyed exactly like attendance: the night's ANCHOR run
-- row + optional group_key. NEVER infer leadership from
-- attendance.recorded_by (that is "who tapped the screen") or
-- runs.leader_name (empty free text).
-- History before 16 Jul is covered entirely by the leader_polls seed, so a
-- backfill pass (photos) must NOT add rows here for those dates - it would
-- double-count against the seed.
CREATE TABLE IF NOT EXISTS run_leadership (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  group_key   text CHECK (group_key IN ('8k', '5k', 'jeff')),
  source      text NOT NULL DEFAULT 'live' CHECK (source IN ('live', 'photo', 'recalled')),
  recorded_by uuid REFERENCES members(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, member_id)  -- one volunteer credit per member per night
);

CREATE INDEX IF NOT EXISTS run_leadership_member_idx ON run_leadership(member_id);
CREATE INDEX IF NOT EXISTS run_leadership_run_idx    ON run_leadership(run_id);

-- ── awards ──────────────────────────────────────────────────────────────────
-- Crossed rungs, one row each, written when a crossing is detected.
-- achieved_on NULL = crossed inside the seed era (undatable - presented as
-- "already achieved"). notified_at tracks the recognition loop (surfacing to
-- the member/leader) so it fires once.
CREATE TABLE IF NOT EXISTS awards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('run', 'volunteer')),
  rung        integer NOT NULL CHECK (rung > 0),
  achieved_on date,
  notified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, kind, rung)
);

CREATE INDEX IF NOT EXISTS awards_member_idx ON awards(member_id);

-- ── consent flag ────────────────────────────────────────────────────────────
-- Awards are private by default, opt-in public (photo_consent mould).
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS awards_public boolean NOT NULL DEFAULT false;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Service-role only (AGENTS.md admin-table rule): attendance history and
-- award state are personal data, and "member sees own / leader sees all"
-- cannot be expressed in RLS (leader identity is is_run_leader checked
-- server-side, not a Postgres role). All access goes through validated API
-- routes. Deliberately NO policies. Mirrors `attendance`.
ALTER TABLE attendance_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_leadership   ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards           ENABLE ROW LEVEL SECURITY;
