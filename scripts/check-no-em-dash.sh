#!/usr/bin/env bash
#
# Fails the build if an em dash, or an HTML entity that renders as one,
# appears in source files. Enforces the no-em-dash rule in AGENTS.md.
#
# The search patterns are built from byte/escape sequences so this script
# stays pure ASCII and never matches itself.
#
# The exempt third-party block lives at the top of AGENTS.md, so AGENTS.md
# is excluded wholesale. Binary files are skipped (git grep -I); node_modules
# and .claude are excluded explicitly in case they are not gitignored.
#
set -euo pipefail

emdash=$(printf '\xe2\x80\x94')   # U+2014 EM DASH, built from bytes
amp='&'                           # so the HTML entity forms are not written literally
pattern="${emdash}|${amp}mdash;|${amp}#8212;|${amp}#x2014;"

matches=$(git grep -I -n -E "$pattern" -- ':!node_modules' ':!.claude' ':!AGENTS.md' || true)

if [ -n "$matches" ]; then
  echo "ERROR: em dashes found in source files. Use a plain hyphen instead. See AGENTS.md."
  echo
  echo "$matches"
  exit 1
fi

echo "OK: no em dashes in source files."
