-- Migration: lock `members` writes to the service role (privilege-escalation fix)
-- ============================================================================
-- Run this in the Supabase SQL editor on BOTH the dev and the production
-- project, and reconcile it into supabase-rls-baseline.sql (already done in the
-- same change). Verify with the access harness (npm run test:access) before merge.
--
-- WHY
-- The `members` RLS policy `Members can access own data` is `FOR ALL TO
-- authenticated USING/WITH CHECK ((SELECT auth.email()) = email)`. RLS scopes
-- access to a row (by email) but Postgres RLS CANNOT restrict which COLUMNS are
-- written, and the "Anon can register" policy is `WITH CHECK (true)`. With the
-- default table-wide grants that left three escalation paths open to anyone
-- holding the public anon key (which ships in the site bundle by design):
--
--   1. A signed-in member could PATCH their own row straight to PostgREST with
--      { is_run_leader: true } - the WITH CHECK passes and the UPDATE grant
--      permitted it. They became a run leader and could read the whole club's
--      emergency/medical PII via /api/leader/contacts.
--   2. Because the policy is FOR ALL, the same member could DELETE their own row
--      and re-INSERT one with is_run_leader = true.
--   3. An ANONYMOUS caller (just the anon key, no sign-in) could INSERT a
--      members row - including is_run_leader = true - for any email. Worse than
--      an escalation: the unique key is (email, first_name, last_name), NOT email
--      alone, and every member lookup resolves by email with .maybeSingle()
--      (requireLeader in lib/apiAuth.ts, /api/home, /api/profile, the app's
--      auth.tsx). maybeSingle() errors on >1 row, so inserting one extra row
--      under a leader's email (any different name) permanently locks that leader
--      out of the register - an unauthenticated denial of service. The same
--      grant also allows bulk fake rows into the roster / admin / member count
--      and arbitrary medical_info text attributed to a real person's email.
--
-- NOTHING in the app writes `members` as the authenticated or anon role. Every
-- write is service-role: registration (/api/join), profile edits and account
-- deletion (/api/profile), setting a run leader and deactivation
-- (/api/admin/members/[id]) - all use supabaseAdmin(), which bypasses these
-- grants. The only non-service client touching the table,
-- components/ThemeProvider.tsx, only SELECTs (theme, font_size). So both roles
-- need SELECT only; every write verb is revoked and the anon INSERT policy is
-- dropped. Leaders remain settable by admins alone (service role).
--
-- FIX
-- ============================================================================

BEGIN;

-- authenticated: SELECT only (own-row read via the "Members can access own data"
-- policy). No INSERT/UPDATE/DELETE - members never write their own row via a JWT.
-- (The table-level REVOKE also clears any lingering column-level UPDATE grants.)
REVOKE INSERT, UPDATE, DELETE ON public.members FROM authenticated;

-- anon: SELECT grant stays inert (no anon SELECT policy), but every write verb is
-- revoked and the WITH CHECK (true) register policy is dropped. Registration is
-- service-role via /api/join, so this removes an unused, dangerous surface.
REVOKE INSERT, UPDATE, DELETE ON public.members FROM anon;
DROP POLICY IF EXISTS "Anon can register" ON public.members;

COMMIT;

-- NOTE (updated 17 Jul 2026): db-diff (scripts/db-diff.mjs) now DOES diff table
-- and column GRANTs, so a future change that re-grants write access here is
-- caught two ways: as dev/prod drift, and - because both projects can be
-- identically wrong, as they were before this migration - by a write-lockdown
-- ALARM checked against intent per project. db-diff is read-only, so unlike the
-- access harness it is safe to point at production routinely. The access harness
-- (tests/access) remains the behavioural guard: it asserts a member cannot write
-- their own row (self-edits go through /api/profile) and an anon caller cannot
-- INSERT a member at all.
