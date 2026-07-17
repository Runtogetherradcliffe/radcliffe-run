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
- GRANTs to `anon` / `authenticated` / `PUBLIC` (table-wide vs column-scoped)

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

> **Correction (17 Jul 2026).** Those 14 drifts are real and the reconciliation
> stands, but they did **not** come from the script as committed - that version
> could never have produced them. `pg_policies.roles` is `name[]` (OID 1003), and
> node-postgres registers no parser for it, so it returns the raw literal
> `"{anon}"` as a *string*; `(r.roles ?? []).slice().sort()` then threw "sort is
> not a function". Because `snapshot()` runs inside main's try/catch, that
> surfaced as `could not connect / query`, which reads like a network fault and
> hides the cause. The broken line was present in `584974e`, the only commit that
> ever touched the file, and `pg-types` has been pinned at 2.2.0 since - so the
> committed tool crashed on **every** run from the day it was written until this
> was fixed. The write-up above was presumably taken from an earlier in-session
> draft and never re-checked against what got committed. Fixed 17 Jul: the SQL
> casts `roles::text[]` (OID 1009, which pg does parse) and `toRoleArray` tolerates
> both shapes. **The lesson is the one this repo keeps relearning:** the unit test
> for that line passed the whole time, because it fed `value()` a real JS array -
> an assumption about the driver that the driver never honoured. A guard nobody has
> watched run is not a guard.

It prints a `present-in-dev-only / present-in-prod-only / differing-definition`
report and **exits non-zero when any drift is found**, so it can gate a scheduled
run or CI.

### Grants, and the write-lockdown alarm (added 17 Jul 2026)

The grants category exists because of the 16 Jul privilege-escalation fix
(`supabase-migration-members-write-lockdown.sql`). RLS scopes a *row*, not a
*column*, so after that fix the property "a member cannot set their own
`is_run_leader = true` and then read the whole club's emergency and medical
details" rests **entirely** on column/table GRANTs - and db-diff could not see
them. This access harness is the named guard, but it is excluded from CI, needs
the service key and a live site, writes test rows, and defaults to dev - so it
could not watch production even if run religiously. db-diff is read-only, and
therefore the only mechanism safe to point at prod routinely.

It reads `pg_catalog` (`relacl` = the table-level ACL, `attacl` = column-level),
**not** `information_schema`. That choice is load-bearing, and the reason is worth
keeping:

- **`column_privileges` cannot see half the verbs.** Only
  `SELECT`/`INSERT`/`UPDATE`/`REFERENCES` can be column-scoped at all, so they are
  the only four that view can *ever* contain - across the whole `public` schema it
  returns exactly that set and nothing else. `DELETE`, `TRUNCATE` and `TRIGGER`
  are table-level and structurally absent from it. This is not academic: the
  16 Jul review checked `column_privileges`, concluded "members is SELECT only",
  and that is how `TRUNCATE` on `members` went unnoticed. The conclusion held -
  `DELETE` really is revoked, confirmed since via `table_privileges` - but the
  evidence could not have shown otherwise. A guard built on that view inherits the
  blind spot over the very verbs it exists to watch.
- **`table_privileges` is incomplete too**: it omits `MAINTAIN` (new in PG17),
  which the SQL-standard views do not model. `aclexplode` reports it. The catalogs
  are the only complete picture.
- **`column_privileges` also expands** a table-wide grant into one row per column,
  so it cannot tell a table-wide `GRANT UPDATE` from one scoped to every column.
  Here a table-wide grant reads `UPDATE=ALL`, a column-scoped one lists its
  columns: `UPDATE=(is_run_leader)`.

`PUBLIC` is watched alongside the two named roles because a grant to `PUBLIC`
reaches both implicitly, so filtering to just `anon`/`authenticated` would miss
it.

There are **two** checks, answering different questions:

| Check | Question | Fires when |
|---|---|---|
| `grants` diff | have the two projects drifted apart? | dev and prod disagree |
| write-lockdown **ALARM** | is either project wrong against *intent*? | a write verb (`INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`) is granted to `anon`/`authenticated`/`PUBLIC` on a write-locked table |

The alarm exists because a diff alone is not enough: **both projects can be
identically wrong**, and before 16 Jul they were. Dev and prod both let
`authenticated` write `members`, so a pure diff would have reported "no drift"
while the escalation hole stood open on both. It is deliberately narrow
(`WRITE_LOCKED_TABLES` in the script - currently just `members`): every table in
`public` carries broad Supabase default grants, most of them inert, and alarming
on all of them would bury a real `members` regression in noise. Add a table there
only when its writes are service-role-only by design.

The report also prints the grants held on the watched tables **even when clean**.
`anon` holds SELECT on every column of `members`: inert today, because no anon
SELECT policy exists, but that is the same shape as the bug that just bit - a
broad grant held back only by the absence of a policy. If anyone adds an anon
SELECT policy for a public page, `emergency_phone` and `medical_info` go with it.

#### The baseline, read from both live projects (17 Jul 2026)

Verified against prod and dev before this shipped. The two are **identical** -
250 grant rows across 16 tables, same fingerprint - so the grants category
reports no drift and the alarm no findings. What that state actually is:

- `members` is the **only** table where `INSERT`/`UPDATE`/`DELETE` are revoked
  from `anon` and `authenticated`. The other 15 still carry them. That is the
  16 Jul lockdown, visible in the data, and it is why the alarm watches those
  three verbs on that one table.
- **"15 of 16 tables grant INSERT/UPDATE/DELETE to anon" reads like an emergency
  and is not one.** Those grants are LATENT: a write needs a grant *and* a
  permissive write policy, and 14 of the 15 have no write policy at all, so RLS
  denies. Checked on prod, 17 Jul: exactly **one** table pairs both -
  `push_subscriptions` ("Anyone can subscribe" INSERT, "Anyone can unsubscribe by
  endpoint" DELETE), which is the deliberate web-push flow. `members` now has the
  policy and no grants, so it too is inert. **There is no second members-shaped
  bug waiting.**
- `TRUNCATE`, `MAINTAIN`, `REFERENCES` and `TRIGGER` are granted to both roles on
  **16 of 16** tables, `members` included. That is Supabase's default posture for
  every table, not a decision made here, so the alarm deliberately ignores them -
  including them would fire on a correct database for ever.
- `TRUNCATE` on `members` is worth knowing about even so: **RLS does not gate
  TRUNCATE**, so it is inert only because PostgREST exposes no TRUNCATE verb -
  held back by the absence of an interface rather than by a policy. Decision
  (Paul, 17 Jul): **record, do not alarm**, and do not raise a migration for it -
  fold the revoke into the `attendance_deletions` migration, which is already
  going to both projects by hand. Two lines at zero marginal cost there; not
  worth its own trip to two dashboards.
- There are currently **no column-level grants at all** on either project (every
  grant is table-wide), which is consistent with the lockdown's note that the
  table-level `REVOKE` also clears lingering column-level `UPDATE` grants.

#### Next: alarm on the PAIRING, not on a list (Paul, 17 Jul - v2, not built)

The alarm watches a hardcoded table list, which only guards the table someone
already thought about. The real danger condition is the **pairing**: a write grant
to `anon`/`authenticated` **and** a permissive write policy on the same table.
That is exactly what bit on 16 Jul - the write grants were Supabase defaults
sitting there harmlessly, and the `members` policy arrived later and *armed* them.
Neither half was wrong alone.

A pairing alarm needs no list and would catch the next one on any table: someone
adds a policy to `attendance` for a feature, not realising the write grants have
been live all along. Per the data above it would be quiet today except
`push_subscriptions`, which would be allowlisted as intentional - so it is
shippable without noise. Both halves are already introspected here (the `grants`
category and the `policies` category), so this is a join, not new plumbing.

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
