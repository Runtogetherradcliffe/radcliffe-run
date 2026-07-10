-- ============================================================================
-- RLS BASELINE - reconciliation of Row Level Security to the live production
-- state, captured 5 Jul 2026 and brought under version control.
--
-- WHY THIS FILE EXISTS
-- RLS policies live inside each Supabase project, not in the app code, and had
-- never been managed as migrations. As a result the dev project, the production
-- project, and the old `supabase-schema-production.sql` snapshot had drifted to
-- THREE different states of the `members` self-access policy (and others). This
-- file captures production's ACTUAL policies verbatim so "dev and production are
-- the same" becomes provable for the database layer, not just the code.
--
-- WHAT IT IS / ISN'T
--   * It is the canonical desired RLS state. Applying it to any project
--     converges that project to this exact set of policies.
--   * It is idempotent and atomic: it drops every known policy name (current
--     names, pre-hardening names, and legacy dev snake_case names) then recreates
--     the canonical set inside one transaction.
--   * HISTORY: this file was first created (5 Jul 2026) by capturing production's
--     then-live policies verbatim to reconcile a dev/prod drift, deliberately
--     preserving the over-broad "Authenticated full access ..." grants. It was
--     then updated (same day) with the SECURITY HARDENING - those blanket
--     authenticated grants are now narrowed (runs = read-only; posts/emails/
--     send-log/snippets/push = service-role only; route_descriptions writes =
--     service-role only). The access-matrix harness (tests/access) verifies the
--     result: members retain only their own-row access and public reads.
--
-- HOW TO USE
--   * Production already matches this file (it was captured FROM production), so
--     running it against production is a safe no-op-equivalent but unnecessary.
--   * Apply to the DEV project to fix the drift (see
--     supabase-migration-dev-rls-align notes in ARCHITECTURE.md).
--   * DETECTING future drift: `npm run db-diff` (scripts/db-diff.mjs) compares the
--     two live projects' schema AND RLS and exits non-zero on any difference.
--     This file is the desired state you reconcile back to; db-diff finds when
--     the projects have wandered apart. See tests/access/README.md.
--   * Scope: the 9 tables that exist on production. The dev project used to
--     carry 5 empty, abandoned roundup tables (parkrun_results, race_results,
--     roundup_posts, roundup_photos, social_run_results) that never existed on
--     production; they were dropped from dev on 5 Jul 2026, so both projects now
--     have exactly these 9 tables.
-- ============================================================================

BEGIN;

-- ── members ────────────────────────────────────────────────────────────────
-- members.id is a random UUID, NOT the auth UUID. Self-access is matched by
-- EMAIL. (Dev had drifted to the broken `auth.uid() = id` form, which never
-- matches - see AGENTS.md.)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can register"            ON public.members;
DROP POLICY IF EXISTS "Members can access own data"  ON public.members;
DROP POLICY IF EXISTS "Members can read own record"  ON public.members;  -- legacy (dev)
DROP POLICY IF EXISTS "Members can update own record" ON public.members; -- legacy (dev)
DROP POLICY IF EXISTS "members_insert_anon"          ON public.members;  -- legacy (dev)

CREATE POLICY "Anon can register"
  ON public.members FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Members can access own data"
  ON public.members FOR ALL TO authenticated
  USING ((SELECT auth.email()) = email)
  WITH CHECK ((SELECT auth.email()) = email);

-- Supports the email-based policy (dev was missing this index entirely).
CREATE INDEX IF NOT EXISTS members_email_idx ON public.members (email);

-- ── runs ───────────────────────────────────────────────────────────────────
-- Reads only for authenticated: the homepage and join flow SELECT runs with the
-- member JWT (server + browser clients). All writes go through the admin API on
-- the service role, so authenticated needs no write grant.
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read runs"              ON public.runs;
DROP POLICY IF EXISTS "Authenticated can read runs"     ON public.runs;
DROP POLICY IF EXISTS "Authenticated full access to runs" ON public.runs;  -- pre-hardening
DROP POLICY IF EXISTS "runs_select_anon"                ON public.runs;  -- legacy (dev)
DROP POLICY IF EXISTS "runs_all_authenticated"          ON public.runs;  -- legacy (dev)

CREATE POLICY "Anon can read runs"
  ON public.runs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can read runs"
  ON public.runs FOR SELECT TO authenticated
  USING (true);

-- ── route_descriptions ─────────────────────────────────────────────────────
ALTER TABLE public.route_descriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read route descriptions"               ON public.route_descriptions;
DROP POLICY IF EXISTS "Authenticated users can insert route descriptions" ON public.route_descriptions;
DROP POLICY IF EXISTS "Authenticated users can update route descriptions" ON public.route_descriptions;

CREATE POLICY "Anyone can read route descriptions"
  ON public.route_descriptions FOR SELECT TO public
  USING (true);

-- Writes (name/description overrides) happen only in the runs sync and the
-- routes admin API, both on the service role. No authenticated write grant.
-- (public SELECT above is intentional - the catalogue is public data.)

-- ── site_settings ──────────────────────────────────────────────────────────
-- (Dev had an extra "Authenticated can read settings" SELECT policy that
-- production lacks - anon can already read settings, so it is redundant.)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read settings"          ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated can update settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.site_settings; -- legacy (dev)

CREATE POLICY "Anon can read settings"
  ON public.site_settings FOR SELECT TO anon
  USING (true);

-- Signed-in members read the same public flags (the native app needs the
-- C25K fields under a member JWT - added Jul 2026). The old
-- "Authenticated can update settings" grant is DROPPED: it was retained
-- only while provably inert (no authenticated SELECT existed); granting
-- SELECT would have armed it, so both changed together. Settings writes are
-- admin-only via /api/admin/settings (service role).
DROP POLICY IF EXISTS "Authenticated can update settings" ON public.site_settings;
CREATE POLICY "Authenticated can read settings"
  ON public.site_settings FOR SELECT TO authenticated
  USING (true);

-- ── posts ──────────────────────────────────────────────────────────────────
-- Public reads published posts (anon); every app read is server-side on the
-- service role. No authenticated grant - members do not read posts by JWT.
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read published posts"     ON public.posts;
DROP POLICY IF EXISTS "Authenticated full access to posts" ON public.posts; -- pre-hardening
DROP POLICY IF EXISTS "Public can read published posts"   ON public.posts; -- legacy (dev)

CREATE POLICY "Anon can read published posts"
  ON public.posts FOR SELECT TO anon
  USING (status = 'published');

-- ── scheduled_emails ───────────────────────────────────────────────────────
-- Admin-only table. Admin identity is an env-var allowlist, NOT a database role,
-- so RLS cannot express "admins only" - admin pages/routes read it on the
-- service role (which bypasses RLS). No authenticated policy, by design.
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access to emails" ON public.scheduled_emails; -- pre-hardening
DROP POLICY IF EXISTS "emails_all_authenticated"            ON public.scheduled_emails; -- legacy (dev)

-- ── email_send_log ─────────────────────────────────────────────────────────
-- Admin-only (holds recipient email addresses). Service role only - see above.
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access to email log" ON public.email_send_log; -- pre-hardening
DROP POLICY IF EXISTS "email_log_all_authenticated"           ON public.email_send_log; -- legacy (dev)

-- ── email_snippets ─────────────────────────────────────────────────────────
-- Admin-only (email templates). Service role only - see above.
ALTER TABLE public.email_snippets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access to snippets" ON public.email_snippets; -- pre-hardening
DROP POLICY IF EXISTS "snippets_all_authenticated"           ON public.email_snippets; -- legacy (dev)

-- ── push_subscriptions ─────────────────────────────────────────────────────
-- (Dev restricted the manage policy to auth.role()='authenticated'; production
-- uses USING (true). Captured as production has it.)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can subscribe"                ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can unsubscribe by endpoint"  ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated can manage subscriptions" ON public.push_subscriptions;

CREATE POLICY "Anyone can subscribe"
  ON public.push_subscriptions FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can unsubscribe by endpoint"
  ON public.push_subscriptions FOR DELETE TO public
  USING (true);

-- No "manage" policy: it granted ALL (incl. SELECT of every endpoint) to any
-- authenticated member. Admin reads/writes go through the service role.

-- ── attendance (native app check-in, Jul 2026) ─────────────────────────────
-- Service-role only: leader identity is is_run_leader checked server-side in
-- the /api/leader/* routes, not a Postgres role, so RLS cannot express
-- "leaders only". Created by supabase-migration-attendance.sql. NO policies.
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ── push_tokens + push_send_log (native app push, Jul 2026) ────────────────
-- Service-role only: writes go through POST /api/push/register and the send
-- routes. Created by supabase-migration-push-tokens.sql. NO policies.
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;

-- ── attendance recognition (Jul 2026) ───────────────────────────────────────
-- Seeds, "led by" records and crossed award rungs - personal data, service-
-- role only, same reasoning as attendance. Created by
-- supabase-migration-attendance-recognition.sql. NO policies.
ALTER TABLE public.attendance_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_leadership   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards           ENABLE ROW LEVEL SECURITY;

COMMIT;
