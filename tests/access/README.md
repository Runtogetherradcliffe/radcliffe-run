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

Note: the dev project additionally carries 5 unreleased roundup tables
(`parkrun_results`, `race_results`, `roundup_posts`, `roundup_photos`,
`social_run_results`) that do not exist on production; the baseline does not
touch them.
