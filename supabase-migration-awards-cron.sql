-- Awards cron claim-lock (12 Jul 2026) - the idempotency claim for the weekly
-- /api/cron/awards run, exactly mirroring push_send_log's pattern: the
-- UNIQUE(ref_date) insert IS the claim-lock, so a retry (cron-job.org retry,
-- manual re-run same day) cannot double-run the job the same day. The awards
-- job is itself idempotent (UNIQUE(member_id, kind, rung) on `awards`), so
-- this is a courtesy against wasted duplicate computation, not a correctness
-- backstop.
--
-- Apply to BOTH dev and production BEFORE deploying the code that uses it.

CREATE TABLE IF NOT EXISTS awards_cron_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_date       date NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  awards_written int,
  UNIQUE (ref_date)
);

-- Service-role only (AGENTS.md admin-table rule): read/write only via the
-- cron route with supabaseAdmin(). NO policies.
ALTER TABLE awards_cron_log ENABLE ROW LEVEL SECURITY;
