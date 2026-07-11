-- Runner home APIs (11 Jul 2026 workshop decision 10) - the development
-- preference ask deferred the schema to build time; this is that moment.
-- A single nullable enum column, skippable, editable forever via
-- PATCH /api/profile, app-only for now (no email use). Decision record:
-- docs/RUNNER_HOME_BRIEF.md.
--
-- Apply to dev FIRST, production only after explicit approval, and BEFORE
-- deploying code that uses this column.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS development_preference text
    CHECK (development_preference IN ('get_fitter', 'run_further', 'first_race', 'enjoy_thursdays'));
