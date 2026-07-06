# Access-matrix audit

A role-based access-control test harness. It signs in as four personas - **anon,
member, run leader, admin** - and asserts what each can and cannot do at two
layers:

- **RLS / PostgREST** - direct database access with the public anon key + the
  persona's own JWT (the attack surface a native app or a curious member has).
- **API routes** - the Next.js endpoints, called over HTTP with real session
  cookies.

It exists to make the "works for admin, broken for leaders" class of regression
impossible to ship unnoticed, and to give the admin-API / RLS hardening a
before/after safety net. It is **not** part of `npm test` or CI - it needs live
credentials and a running server.

## Running it

```bash
# 1. .env.local must point at the target Supabase project and include
#    SUPABASE_SERVICE_ROLE_KEY (it does by default = the DEV project).
# 2. Start the server the personas will hit:
npm run dev
# 3. In another terminal:
npm run test:access
```

Sessions are minted with the service role via `generateLink` - **no OTP emails
are sent**. Three fixed test identities are created on the target project
(`access-test-member@`, `access-test-leader@`, `access-test-victim@
radcliffe.run`) plus the admin email (must be in the server's `ADMIN_EMAILS`).
Probe rows are created in setup and deleted in teardown; the identities persist
between runs.

### Overrides (all optional)

| Env var | Default |
|---|---|
| `ACCESS_SITE_URL` | `http://localhost:3000` |
| `ACCESS_SUPABASE_URL` / `ACCESS_SUPABASE_ANON_KEY` / `ACCESS_SERVICE_ROLE_KEY` | from `.env.local` |
| `ACCESS_ADMIN_EMAIL` | `paul.j.cox@gmail.com` |
| `ACCESS_ALLOW_PRODUCTION` | unset - required (`=1`) to run against the production project, which the harness otherwise refuses (it writes probe rows) |

## Reading the results

Tests fall into two groups:

- **Legitimate paths** (untagged) - member self-access, leader emergency
  contacts, admin tooling, anon public reads. These must be **green before and
  after** any change. A red one here is a real regression.
- **`[HOLE]` tests** - assert the *target* secure state on paths that are
  currently insecure (the 8 unguarded `/api/admin/*` routes and the over-broad
  `authenticated` RLS grants). They are **expected to fail on the un-hardened
  site** - that red baseline proves the harness can see the holes. Each flips to
  green when its fix lands. The hardening is done when the whole suite is green.

## Dev/production RLS drift - found here, now reconciled

First run (5 Jul 2026) surfaced a real drift: the **DEV** project's `members`
self-access policy was `auth.uid() = id` - the stale, broken form the top-level
`AGENTS.md` invariant forbids (it never matches, because `members.id` is a random
UUID, not the auth UUID), while **production** correctly used
`(auth.email()) = email`. The three member/leader self-access tests failed on dev
for that reason alone (a member genuinely could not read their own row there).

RLS policies had never been version-controlled, so dev, production, and the old
`supabase-schema-production.sql` snapshot had drifted to three different states.
This was reconciled the same day: `supabase-rls-baseline.sql` captures
production's actual live policies as the source of truth, and dev was aligned to
match it (the 9 shared tables are now byte-for-byte identical). After alignment
the harness's legitimate-path tests are green on dev, so **dev is now a faithful
rehearsal environment** for the admin-API / RLS hardening.

The reconciliation also removed a second drift: the dev project carried 5 empty,
abandoned roundup tables (`parkrun_results`, `race_results`, `roundup_posts`,
`roundup_photos`, `social_run_results`) that never existed on production and are
no longer used. They were dropped from dev (and their dead type blocks removed
from `lib/database.types.ts`), so both projects now have exactly the same 9
tables.

## Preventing future drift - `npm run db-diff`

The access harness only checks *authz behaviour* on *one* environment at a time;
it does not see schema, index or constraint drift, and it cannot compare the two
projects. `scripts/db-diff.mjs` (run with `npm run db-diff`) fills that gap: it
connects to **both** Supabase projects read-only, introspects the `public`
schema from `pg_catalog` / `information_schema` / `pg_policies`, and reports every
difference in:

- tables
- columns (name, type, nullability, default)
- indexes (full `indexdef`)
- constraints (primary key, unique, check, foreign key)
- RLS policies (name, cmd, roles, permissive, `qual`, `with_check`)
- whether RLS is enabled per table

It is the automated detector for exactly the class of drift found on 5 Jul 2026
(the broken dev `members` policy, the extra roundup tables, the missing unique
constraint). `supabase-rls-baseline.sql` is the canonical *desired* RLS state and
the thing you reconcile drift *back to*; `db-diff` is what tells you the two live
projects have wandered apart in the first place.

Its first live run (6 Jul 2026) proved the point: RLS, policies and tables all
matched (the 5 Jul reconciliation held), but it surfaced **14 deeper drifts** the
manual pass never looked at - 11 column differences (nullability, defaults,
types), a `runs.terrain` check constraint that allowed `'mixed'` on dev but not
on production (so a sheet row marked "Mixed" would sync on dev and fail on
live), and a prod-only unique constraint on `runs.google_event_id`. All were
reconciled the same day by aligning dev to production - see
`supabase-migration-dev-schema-align.sql` - and the report is now clean on all
six categories.

It prints a `present-in-dev-only / present-in-prod-only / differing-definition`
report and **exits non-zero when any drift is found**, so it can gate a scheduled
run or CI.

### Running it

```bash
# Both connection strings must be set (env var or .env.local, which is gitignored):
export DBDIFF_DEV_DB_URL='postgresql://postgres.rnbiqxhlqjbahgiwabuv:...@...pooler.supabase.com:5432/postgres'
export DBDIFF_PROD_DB_URL='postgresql://postgres.qpdymxagloeghypntpct:...@...pooler.supabase.com:5432/postgres'
npm run db-diff
```

Get each string from the Supabase dashboard: **Project settings -> Database ->
Connection string -> Session pooler** (it embeds the database password). The prod
string is read from an env var and is **never** committed - store it in the
gitignored `.env.local` alongside the dev one if you want `npm run db-diff` to
just work. A real shell env var always wins over `.env.local`.

Why a Postgres connection string and not the service-role key + Supabase client:
the JS client can only read `public` tables via PostgREST - it cannot query the
catalogs (`pg_catalog` etc.) at all. The script opens a `read only` session and
creates/writes nothing.

| Env var | Purpose |
|---|---|
| `DBDIFF_DEV_DB_URL` | dev project connection string (ref `rnbiqxhlqjbahgiwabuv`) |
| `DBDIFF_PROD_DB_URL` | prod project connection string (ref `qpdymxagloeghypntpct`) |
| `DBDIFF_JSON=1` | emit a JSON report instead of text (for the scheduled alert) |
| `DBDIFF_NO_SSL=1` | disable TLS (local Postgres only; Supabase needs TLS) |

The pure diff/format logic has unit tests (no DB, no credentials):
`npm run db-diff:test`. Those live in `scripts/`, deliberately outside the
`tests/**` glob, so they stay out of the default `npm test` / CI - like the
access harness, the real run needs live credentials.

### Scheduling a drift alert (stretch)

`npm run db-diff` is a plain exit-code gate, so any scheduler that can run a node
command and act on a non-zero exit will do. The project already keeps a
cron-job.org job as a backstop for the email cron (Vercel Hobby allows only one
cron schedule per day - see `AGENTS.md`), so the natural home is either a
scheduled task on Paul's machine or a small CI workflow that runs `DBDIFF_JSON=1
npm run db-diff` on a schedule with the two connection strings in its secrets and
pings Paul (email / push) when the exit code is `1`. Keep the credentials out of
the public repo: they belong in the scheduler's secret store, never a committed
file.
