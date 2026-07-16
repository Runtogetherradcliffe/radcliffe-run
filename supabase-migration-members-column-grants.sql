-- Migration: column-scope member self-writes on `members` (privilege-escalation fix)
-- ============================================================================
-- Run this in the Supabase SQL editor on BOTH the dev and the production
-- project, and reconcile it into supabase-rls-baseline.sql (already done in the
-- same change). Verify with the access harness (npm run test:access) before merge.
--
-- WHY
-- The `members` RLS policy `Members can access own data` is `FOR ALL TO
-- authenticated USING/WITH CHECK ((SELECT auth.email()) = email)`. RLS scopes
-- access to the caller's OWN row (by email) but Postgres RLS CANNOT restrict
-- WHICH COLUMNS are written - that needs column-level GRANTs. With the default
-- table-wide grants, that left two privilege-escalation paths open to anyone
-- holding the public anon key (which ships in the site bundle by design):
--
--   1. A signed-in member could PATCH their own row straight to PostgREST with
--      { is_run_leader: true } - the WITH CHECK passes (email unchanged), and
--      the column UPDATE grant permitted it. They became a run leader and could
--      then read the whole club's emergency/medical PII via /api/leader/contacts.
--      (UPDATE is also how they could set their own status/cohort.)
--   2. Because the policy is FOR ALL, the same member could DELETE their own row
--      and re-INSERT one with is_run_leader = true; and an *anonymous* caller
--      (just the anon key) could INSERT a members row with is_run_leader = true
--      for an email they control, then sign in via OTP as a fresh "leader".
--
-- Leaders are meant to be set ONLY by an admin via PATCH /api/admin/members/[id]
-- (service role). No part of the app writes `members` as the authenticated or
-- anon role - self-edits go through PATCH /api/profile, registration through
-- /api/join, deletion through DELETE /api/profile, all on the service role,
-- which bypasses these grants. So we can safely strip the blanket write verbs
-- and re-grant only the columns each role legitimately writes.
--
-- FIX (grant layer - the only layer that can express columns)
-- ============================================================================

BEGIN;

-- authenticated: keep SELECT (own-row read via the existing policy) and UPDATE,
-- but only on the self-editable columns - the exact set PATCH /api/profile
-- whitelists (ALLOWED_FIELDS). No INSERT/DELETE: members never create or delete
-- their own row via a JWT.
REVOKE INSERT, UPDATE, DELETE ON public.members FROM authenticated;
GRANT UPDATE (
  first_name, last_name, mobile,
  emergency_name, emergency_phone, emergency_relationship,
  medical_info, email_opt_out, photo_consent,
  theme, font_size, awards_public, development_preference
) ON public.members TO authenticated;

-- anon: keep registration (INSERT) but column-scope it so the WITH CHECK (true)
-- "Anon can register" policy cannot be used to plant a leader row. is_run_leader,
-- status, cohort, uka_number etc. are NOT granted - they fall back to their safe
-- column DEFAULTS (is_run_leader=false, status='active'). Real registration
-- (/api/join) is service-role and unaffected. anon has no UPDATE/DELETE policy,
-- so those grants were already inert; revoke them anyway (defence in depth
-- against a future anon policy).
REVOKE INSERT, UPDATE, DELETE ON public.members FROM anon;
GRANT INSERT (
  first_name, last_name, email, mobile,
  emergency_name, emergency_phone, emergency_relationship,
  medical_info, consent_data, consent_medical, health_declaration,
  email_opt_out, photo_consent
) ON public.members TO anon;

COMMIT;

-- NOTE: db-diff (scripts/db-diff.mjs) compares policies + schema but NOT column
-- GRANTs, so it will not detect drift on these grants. The regression guard is
-- the access harness (tests/access) - it now asserts a member cannot set
-- is_run_leader and an anon cannot register as a leader. Extending db-diff to
-- diff column privileges is a reasonable follow-up.
