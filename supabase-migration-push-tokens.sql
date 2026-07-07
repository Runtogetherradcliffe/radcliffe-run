-- Native push tokens (Expo Push, iOS + Android) - NATIVE_APP_SCOPE.md
-- section 2. Separate from push_subscriptions, whose columns are
-- web-push-shaped (endpoint/p256dh/auth). Registration goes through
-- POST /api/push/register (server-side validation), never direct PostgREST
-- writes. The GDPR cron prunes tokens not seen for ~12 months; member
-- deletion cascades.
--
-- push_send_log is the idempotency claim for automated sends (the Thursday
-- announcement): the UNIQUE(kind, ref_date) insert is the claim-lock, so a
-- second trigger (cron-job.org retry, manual re-run) cannot double-send.
--
-- Apply to BOTH dev and production BEFORE deploying code that uses it.

CREATE TABLE IF NOT EXISTS push_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token        text UNIQUE NOT NULL,           -- ExponentPushToken[...]
  platform     text NOT NULL,                  -- 'ios' | 'android'
  member_id    uuid REFERENCES members(id) ON DELETE CASCADE,  -- null when not signed in
  prefs        jsonb NOT NULL DEFAULT '{"weekly": true, "alerts": true}',
  created_at   timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_member_idx ON push_tokens(member_id);

CREATE TABLE IF NOT EXISTS push_send_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL,               -- 'weekly' | 'cancellation' | 'manual'
  ref_date        date NOT NULL,               -- the run date the send is about
  sent_at         timestamptz NOT NULL DEFAULT now(),
  recipient_count int,
  UNIQUE (kind, ref_date)
);

-- Service-role only, both tables (AGENTS.md admin-table rule): writes go
-- through API routes; sends read tokens with supabaseAdmin(). NO policies.
ALTER TABLE push_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_send_log ENABLE ROW LEVEL SECURITY;
