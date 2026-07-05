#!/usr/bin/env bash
# Stop-hook: nudge to keep the docs current when a change touched a doc-sensitive
# surface (an API route, the DB schema/RLS, a cron, middleware) but did NOT update
# AGENTS.md or docs/ARCHITECTURE.md.
#
# Wired as a Stop hook in .claude/settings.json. It reads the hook JSON on stdin,
# fires at most once per turn (via stop_hook_active) so it can never loop, and
# exits 2 to feed the reminder back to Claude and block that single stop. It is a
# heuristic reminder, not a correctness check - if no doc change is warranted,
# Claude says so and stops again (the second stop is not blocked).
set -uo pipefail

input=$(cat 2>/dev/null || true)

# Already inside a stop-hook continuation? Do not block again - avoids any loop.
if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$root" ] && cd "$root" 2>/dev/null || exit 0

# Files changed this session: uncommitted (working + staged) plus any commits on
# the current branch not yet on origin/main (the window before the final merge).
changed=$(
  {
    git diff --name-only 2>/dev/null                       # tracked, unstaged
    git diff --cached --name-only 2>/dev/null              # staged
    git ls-files --others --exclude-standard 2>/dev/null   # new, untracked
    git diff --name-only origin/main...HEAD 2>/dev/null    # committed, not yet on main
  } | sort -u
)
[ -z "$changed" ] && exit 0

# Doc-sensitive surfaces.
sensitive=$(printf '%s\n' "$changed" | grep -E '^(app/api/|supabase-migration.*\.sql$|supabase-rls-baseline\.sql$|supabase-schema.*\.sql$|vercel\.json$|middleware\.ts$)' || true)
[ -z "$sensitive" ] && exit 0

# Were the docs updated alongside?
docs=$(printf '%s\n' "$changed" | grep -E '^(AGENTS\.md$|docs/ARCHITECTURE\.md$)' || true)
[ -n "$docs" ] && exit 0

# Doc-sensitive change with no doc edit -> remind once.
{
  echo "Docs freshness check: this session changed doc-sensitive files but AGENTS.md / docs/ARCHITECTURE.md were not updated:"
  printf '%s\n' "$sensitive" | sed 's/^/  - /'
  echo ""
  echo "Per AGENTS.md, update the docs in the SAME change if this altered a route's auth or contract, the DB schema (table/column/index/RLS), an env var, a cron, or an invariant. If no doc change is warranted here, say so explicitly and stop again."
} >&2
exit 2
