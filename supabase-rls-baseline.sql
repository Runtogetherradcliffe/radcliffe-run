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
--   * It is the canonical, current PRODUCTION state (verified against project
--     qpdymxagloeghypntpct on 5 Jul 2026). Applying it to a fresh project
--     reproduces production. Applying it to dev ALIGNS dev to production.
--   * It is idempotent and atomic: it drops every known policy name (both the
--     production names and the legacy dev snake_case names) then recreates the
--     canonical set inside one transaction.
--   * It is NOT the security hardening. It deliberately preserves the CURRENT,
--     still-over-broad "Authenticated full access ..." grants exactly as
--     production has them today. Narrowing those is a SEPARATE later migration,
--     verified with the access-matrix harness (tests/access). Do not fold the
--     two together - this step must be a behaviour-preserving snapshot.
--
-- HOW TO USE
--   * Production already matches this file (it was captured FROM production), so
--     running it against production is a safe no-op-equivalent but unnecessary.
--   * Apply to the DEV project to fix the drift (see
--     supabase-migration-dev-rls-align notes in ARCHITECTURE.md).
--   * Scope: the 9 tables that exist on production. The dev project also carries
--     5 unreleased roundup tables (parkrun_results, race_results, roundup_posts,
--     roundup_photos, social_run_results) that do NOT exist on production; this
--     file does not touch them.
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
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read runs"              ON public.runs;
DROP POLICY IF EXISTS "Authenticated full access to runs" ON public.runs;
DROP POLICY IF EXISTS "runs_select_anon"                ON public.runs;  -- legacy (dev)
DROP POLICY IF EXISTS "runs_all_authenticated"          ON public.runs;  -- legacy (dev)

CREATE POLICY "Anon can read runs"
  ON public.runs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated full access to runs"
  ON public.runs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── route_descriptions ─────────────────────────────────────────────────────
ALTER TABLE public.route_descriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read route descriptions"               ON public.route_descriptions;
DROP POLICY IF EXISTS "Authenticated users can insert route descriptions" ON public.route_descriptions;
DROP POLICY IF EXISTS "Authenticated users can update route descriptions" ON public.route_descriptions;

CREATE POLICY "Anyone can read route descriptions"
  ON public.route_descriptions FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can insert route descriptions"
  ON public.route_descriptions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update route descriptions"
  ON public.route_descriptions FOR UPDATE TO authenticated
  USING (true);

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

CREATE POLICY "Authenticated can update settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (true);

-- ── posts ──────────────────────────────────────────────────────────────────
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read published posts"     ON public.posts;
DROP POLICY IF EXISTS "Authenticated full access to posts" ON public.posts;
DROP POLICY IF EXISTS "Public can read published posts"   ON public.posts; -- legacy (dev)

CREATE POLICY "Anon can read published posts"
  ON public.posts FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated full access to posts"
  ON public.posts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── scheduled_emails ───────────────────────────────────────────────────────
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access to emails" ON public.scheduled_emails;
DROP POLICY IF EXISTS "emails_all_authenticated"            ON public.scheduled_emails; -- legacy (dev)

CREATE POLICY "Authenticated full access to emails"
  ON public.scheduled_emails FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── email_send_log ─────────────────────────────────────────────────────────
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access to email log" ON public.email_send_log;
DROP POLICY IF EXISTS "email_log_all_authenticated"           ON public.email_send_log; -- legacy (dev)

CREATE POLICY "Authenticated full access to email log"
  ON public.email_send_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── email_snippets ─────────────────────────────────────────────────────────
ALTER TABLE public.email_snippets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access to snippets" ON public.email_snippets;
DROP POLICY IF EXISTS "snippets_all_authenticated"           ON public.email_snippets; -- legacy (dev)

CREATE POLICY "Authenticated full access to snippets"
  ON public.email_snippets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

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

CREATE POLICY "Authenticated can manage subscriptions"
  ON public.push_subscriptions FOR ALL TO public
  USING (true);

COMMIT;
