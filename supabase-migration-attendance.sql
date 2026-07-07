-- Attendance capture (native app v1 / check-in) - decided at the 6 Jul 2026
-- workshop (docs/C25K_ENGAGEMENT_RESEARCH.md section 6, NATIVE_APP_SCOPE.md
-- section 8). Leader one-tap register is the system of record; member
-- self-report exists only for solo weekend C25K sessions. The award ladder
-- (v1.1) needs nothing beyond these columns: lifetime counts are
-- count(*) per member, programme/day splits join runs.run_type + runs.date,
-- and source keeps leader-verified vs self-reported honest.
--
-- Apply to BOTH dev and production BEFORE deploying code that uses it.

CREATE TABLE IF NOT EXISTS attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by  uuid REFERENCES members(id) ON DELETE SET NULL,  -- the leader who tapped
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL DEFAULT 'leader',  -- 'leader' | 'self_report'
  group_key    text,                            -- '8k' | '5k' | 'jeff' (display + counters)
  UNIQUE (run_id, member_id)   -- one record per member per session; re-taps idempotent
);

CREATE INDEX IF NOT EXISTS attendance_member_idx ON attendance(member_id);  -- milestone counts
CREATE INDEX IF NOT EXISTS attendance_run_idx    ON attendance(run_id);     -- session registers

-- Service-role only (AGENTS.md admin-table rule): leader identity is
-- is_run_leader checked server-side, not a Postgres role, so RLS cannot
-- express "leaders only". All reads/writes go through leader-gated API
-- routes. Deliberately NO policies.
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
