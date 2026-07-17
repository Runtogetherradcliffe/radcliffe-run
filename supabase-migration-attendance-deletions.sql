-- Attendance deletion audit trail (register integrity, Jul 2026)
-- ============================================================================
-- Run this in the Supabase SQL editor on BOTH the dev and the production
-- project, and reconcile it into supabase-rls-baseline.sql (done in the same
-- change). Afterwards the read-only db-diff (npm run db-diff) confirms dev and
-- prod agree on the new table's grants.
--
-- WHY
-- POST /api/leader/checkin with present=false HARD-DELETES the attendance row
-- (and any run_leadership row), recording nothing. On 16 Jul 2026 a member who
-- genuinely attended was silently removed from the register at 20:34:57 BST by a
-- phantom uncheck; tracing it needed Vercel runtime logs plus Supabase edge-log
-- forensics, because the delete leaves NO trace in the database and edge logs
-- only reach back 24h. A week-old version of the same question is unanswerable.
--
-- An append-only audit row captured BEFORE the delete makes "who removed this
-- attendee, and when?" answerable indefinitely. Soft-delete was rejected: a
-- present=false flag would ripple through every attendance consumer (summary,
-- usual-group inference, awards cron, milestoneTonight), none of which should
-- change - the audit table is additive and touches nothing that reads
-- attendance.
--
-- Deliberately NO foreign keys to members/runs. The audit must survive a member
-- (or run) deletion - the members FK cascade on `attendance` is exactly what
-- makes rows vanish without trace today, so this table must not inherit it.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.attendance_deletions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                 uuid,          -- run the removed attendance was for
  member_id              uuid,          -- member removed from the register
  group_key              text,          -- '8k' | '5k' | 'jeff' | null, as recorded
  originally_recorded_by uuid,          -- leader who first checked them in
  originally_recorded_at timestamptz,   -- when they were checked in
  had_leadership_row     boolean,       -- was a run_leadership (volunteer) row removed too
  deleted_by             uuid NOT NULL, -- the authed leader who unchecked them
  deleted_at             timestamptz NOT NULL DEFAULT now()
  -- No FKs by design (see header): the audit must outlive a member/run deletion.
);

-- Service-role only, and stricter than its sibling attendance tables: RLS ON
-- with NO policies AND the default anon/authenticated grants REVOKEd. The app
-- never reads this table - only forensic SQL via the service role does - and it
-- records who-removed-whom, so it is locked to defence-in-depth on grants as
-- well as RLS (the 16 Jul lockdown lesson: grants are load-bearing, not just
-- RLS). Do NOT "normalise" it back to the RLS-only sibling pattern.
ALTER TABLE public.attendance_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_deletions FROM anon, authenticated;

-- ── members: revoke TRUNCATE, TRIGGER from anon/authenticated ────────────────
-- Free on this trip (this file is already going by hand to both projects; not
-- worth a migration of its own). anon/authenticated hold TRUNCATE and TRIGGER on
-- members - a Supabase default, present on all 16 tables. RLS does not gate
-- TRUNCATE, so the only thing between anon and wiping the membership is that
-- PostgREST exposes no TRUNCATE verb: an interface limitation, not a permission.
-- Same shape as the 16 Jul escalation (a broad grant held back only by an absent
-- interface), low risk but worth closing while here. Nothing uses either -
-- PostgREST never issues TRUNCATE and DDL (TRIGGER) is not exposed. These are
-- NOT drift and are NOT db-diff-alarmed on: granted on 16/16 tables, a general
-- alarm would fire on a correct database for ever and bury a real regression.
REVOKE TRUNCATE, TRIGGER ON public.members FROM anon, authenticated;

COMMIT;
