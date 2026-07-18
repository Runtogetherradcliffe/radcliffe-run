#!/usr/bin/env bash
# Re-run the attendance history import after an old member (re-)registers.
# Wraps scripts/import_attendance_seeds.py with the canonical launch-import
# flags so newly registered members pick up their old-site / photo-era
# history. Idempotent - existing members' seeds are unchanged; the only new
# writes are for people who registered since the last run.
#
# One-time setup: create .env.production.local (gitignored) in the repo root
# with the PRODUCTION credentials from the Supabase dashboard:
#   SUPABASE_URL=https://qpdymxagloeghypntpct.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service role key>
#
# Usage:
#   scripts/rerun-history-import.sh            dry run (report only)
#   scripts/rerun-history-import.sh --apply    write to production
#
# NO PRODUCTION KEY? There is a credential-free route that never needs
# .env.production.local. Call the importer directly with the same ARGS below
# plus offline dumps and SQL emission, then apply the SQL with the Supabase
# MCP (project qpdymxagloeghypntpct):
#
#   python3 scripts/import_attendance_seeds.py "${ARGS[@]}" \
#     --members-json data/attendance-backfill/members-prod.json \
#     --runs-json    data/attendance-backfill/runs-prod.json \
#     --emit-sql     /tmp/seeds.sql
#
# That writes /tmp/seeds.sql (attendance_seeds upsert) and
# /tmp/seeds-checkins.sql (era-2 attendance rows). Both are idempotent: seeds
# upsert on (member_id, kind, source), attendance rows DO NOTHING on conflict
# so a live check-in always beats a photo reconstruction.
#
# Two things to get right on this route:
#   1. Refresh the dumps first. They are point-in-time snapshots, so anyone who
#      registered since the last run is missing and will be silently skipped.
#      Top them up from production via the MCP (members: id, email, first_name,
#      last_name, status / runs: id, date, distance_km, run_type, cancelled).
#   2. Diff before you apply. A full re-run regenerates EVERY member's seeds,
#      so the emitted SQL is mostly no-ops. Diff it against the live
#      attendance_seeds keyed on (member_id, kind, source) to see the real
#      change set - otherwise you cannot tell a genuine new import from a
#      rewrite of what was already there.
#
# After an --apply, awards catch up at the next Thursday 22:30 cron run (or
# a cron-job.org "Test run" - never on a Thursday, it consumes that day's
# claim slot). Backfilled history lands QUIETLY (the cutoff rule); only
# genuinely fresh crossings celebrate.

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.production.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE - create it with the production SUPABASE_URL and" >&2
  echo "SUPABASE_SERVICE_ROLE_KEY (see the header of this script)." >&2
  echo >&2
  echo "No production key to hand? See 'NO PRODUCTION KEY?' in the header for" >&2
  echo "the credential-free route (offline dumps + --emit-sql + Supabase MCP)." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BACKFILL="data/attendance-backfill"
ARGS=(
  --csv "$BACKFILL/runner-attendance-2026-04-30.csv"
  --polls data/leader-polls/leaders_polls_resolved.json
  --aliases "$BACKFILL/aliases.json"
  --poll-exclude "$BACKFILL/poll-exclude.json"
  --precounts "$BACKFILL/precounts"
  --checkins "$BACKFILL/photo-checkins.txt"
)

if [[ "${1:-}" == "--apply" ]]; then
  echo "APPLYING to production..."
  python3 scripts/import_attendance_seeds.py "${ARGS[@]}" --apply
else
  echo "Dry run against production members (nothing written)."
  echo "Read the report, then re-run with --apply."
  echo
  python3 scripts/import_attendance_seeds.py "${ARGS[@]}"
fi
