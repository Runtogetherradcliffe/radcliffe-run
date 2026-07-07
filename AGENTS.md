<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Critical invariants

These rules exist because breaking them has taken down live functionality before.
Full background in `docs/ARCHITECTURE.md`. Read this whole file before changing code.

**Keep the docs current as you go.** Before ending a turn that changed any of: an
`/api/**` route's auth or contract, the DB schema (a `supabase-migration*.sql`, a table,
column, index, or RLS policy), an env var, a cron, or one of the invariants below - update
`AGENTS.md` and/or `docs/ARCHITECTURE.md` in the SAME change so they never lag reality. A
`Stop` hook (`scripts/docs-freshness-check.sh`) flags this if code changed without a
matching doc edit; treat that reminder as a blocking checklist item, not a suggestion.

## Database and auth

- **`members.id` is NOT the Supabase auth UUID.** It is `gen_random_uuid()` assigned at
  registration. Never write an RLS policy as `auth.uid() = id` - it will never match.
  Member self-access RLS must use `(SELECT auth.email()) = email`.
- **Admin and leader pages must use `supabaseAdmin()`** (service role, bypasses RLS) -
  see `lib/supabase.ts`. The user-JWT client (`utils/supabase/server.ts`) is subject to
  RLS and returns no rows for queries that scan all members. A past security fix that
  narrowed RLS broke every admin/leader page that relied on the wrong client.
- **`app/api/join/route.ts` INSERTs every member column unconditionally** (including
  `c25k_session` for regular signups). Any column referenced there that is missing from
  the production `members` table breaks registration for ALL users. Before deploying any
  change to this file, verify every column in the INSERT exists on production.
- Schema changes go to production Supabase BEFORE the code that uses them is deployed.
- **Every `/api/admin/*` route must call `requireAdmin()`** (`lib/admin.ts`) - a bare
  `getUser()` check is NOT enough. `middleware.ts` gates `/admin/*` *pages* but does NOT
  cover `/api/admin/*` API paths, so a route that only checks "is there a session" is
  callable by any signed-in member. Eight routes shipped this way and were fixed (Jul
  2026); do not reintroduce the pattern in a new admin route.
- **Admin-only tables are service-role only - never grant them an `authenticated` RLS
  policy.** Admin identity is the `ADMIN_EMAILS` env allowlist, NOT a Postgres role, so
  RLS cannot express "admins only": an `authenticated` grant exposes the table to every
  member. Admin pages/routes read these tables with `supabaseAdmin()` (bypasses RLS).
  This applies to `scheduled_emails`, `email_send_log`, `email_snippets`,
  `push_subscriptions` (manage), the write side of `runs`/`posts`/`route_descriptions`,
  and the native-app tables `attendance`, `push_tokens`, `push_send_log` (Jul 2026 -
  RLS enabled, NO policies; all access via leader-gated or validated API routes).
- **Bearer tokens are a first-class auth transport (Jul 2026).** `lib/apiAuth.ts`
  (`getUserFromRequest` / `requireLeader`) accepts `Authorization: Bearer <supabase
  access token>` alongside session cookies - the native app authenticates this way.
  New app-facing routes must use these helpers, NOT a bare cookie client; an explicit
  Bearer that fails validation must NOT fall back to cookies. Leader-gated routes
  (`/api/leader/*`) check `is_run_leader` server-side via the service role.
- **RLS is version-controlled in `supabase-rls-baseline.sql`** - the single source of
  truth for every policy. Policies live in the Supabase projects (not code) and once
  drifted between dev and prod. Any RLS change edits that file, is applied to BOTH the
  dev and production projects, and is verified with the `tests/access` harness
  (`npm run test:access`) before merge. Dev now mirrors production exactly - keep it that
  way.

## Runs sync (Google Sheet)

- **The Thursday sheet's "On tour meeting location map" column (AH) is shared with
  other systems** - a Google Apps Script builds a public calendar from the same sheet,
  and it's also read by the separate Abingdon app project. Both expect a plain Google
  Maps share URL there. Do NOT repurpose that column's format (e.g. storing raw
  coordinates instead of a URL) - doing so once broke the calendar event descriptions
  and needed a manual fix on production data. `app/api/admin/runs/sync/route.ts`
  resolves the URL to lat/lng itself at sync time (`lib/mapLink.ts`, follows
  short-link redirects) and caches the result in `runs.meeting_lat`/`meeting_lng` -
  keep any future map-precision work internal to this DB, never by changing what goes
  in the sheet.

## Email

- **Two separate email systems.** Content email (newsletter, welcome, contact form) goes
  via the Brevo transactional API in app code (`lib/brevo.ts`). Login OTP and magic-link
  emails are sent by Supabase Auth via Resend SMTP configured in the Supabase dashboard,
  NOT in this codebase. Do not remove the Resend account or its `resend._domainkey` DNS
  record - sign-in would break for everyone.
- **Route links in emails must be `/routes#<slug>`, never `/routes/<slug>`.** The routes
  page selects routes client-side via the URL hash; there is no per-route page. Path-style
  links 404'd in a sent newsletter. `app/routes/[slug]/page.tsx` exists only to redirect
  old path-style links to the hash form - keep it.
- The newsletter sends one Brevo request per member (bounded concurrency 5), because
  Brevo's batch `messageVersions` cannot vary HTML or headers per recipient and each
  member needs a personalised unsubscribe link. Keep `maxDuration = 60` on the cron and
  send routes, and keep mark-sent-only-on-success behaviour.
- **The send is claim-locked** so two triggers (the Vercel cron and the external cron
  backstop) cannot both deliver the same email: `sendScheduledEmail` atomically stamps
  `sent_at` while status is still `scheduled` and only the winner proceeds; a claim older
  than 10 minutes counts as stale and is reclaimable. `sent_at` doubles as that lease - do
  NOT "tidy" it away. On all-fail it clears `sent_at` and leaves the email `scheduled` to retry.
- **New Brevo accounts throttle the first bulk sends.** Brevo accepts every message via the
  API (200) but drip-releases delivery over ~an hour for a young account; this is normal and
  eases as the account warms up. "Accepted" in our logs is not "delivered" - check Brevo's
  own transactional log for delivery status.

## Styling and theming

- **Never hardcode hex colours or px font sizes in TSX.** Use the CSS variables
  (`var(--bg)`, `var(--card)`, `var(--orange)`, `var(--text-sm)` etc.). This includes
  inside template literals, which bulk find/replace misses.
- **Theme variables live in THREE places that must stay in sync:** `LIGHT_VARS` in
  `components/ThemeProvider.tsx`, the `lv` object in the inline anti-flash script in
  `app/layout.tsx`, and the `[data-theme="light"]` block in `app/globals.css`. A new
  colour token goes in all three plus a dark default in `:root`.
- Route map cards use `<ThemeMapImage slug={...} />`, never `<img>` - every route needs
  BOTH a dark webp (`public/route-maps/<slug>.webp`) and a light webp
  (`public/route-maps/light/<slug>.webp`).
- **No em dashes anywhere in source files.** Use a plain hyphen. (The block at the
  top of this file is third-party managed and exempt.)

## Build and deploy

- **Staging-first, mandatory.** Push to `staging` (Vercel preview), get explicit approval,
  then merge `staging` into `main`. Never push directly to `main`.
- **Every change becomes a real git commit on a branch cut from fresh `origin/main`.**
  Past breakage came from branches cut from stale main reverting already-deployed fixes.
- **One canonical working copy: `/Users/paulcox/Dev for radcliffe run/radcliffe-run`.**
  Do not create or work from other clones, FUSE mounts, or stray worktrees. `git pull`
  (fast-forward) before starting work so local `main` always tracks live. This folder once
  drifted 21 commits behind live because deploys were made elsewhere and it was never pulled.
- **Commit and push with normal git from that folder**, authenticating via the macOS
  keychain (`git config --global credential.helper osxkeychain`). Do NOT use API-push
  scripts that write commits straight to GitHub (they show committer `GitHub
  <noreply@github.com>`, bypass local `main`, and cause it to drift). NEVER embed a personal
  access token in the remote URL - it leaks via `git remote -v`; keep the remote as the clean
  `https://github.com/Runtogetherradcliffe/radcliffe-run.git`. The repo is public, so reads
  (fetch/pull/clone) need no auth and never prompt; only push uses the token. A new PAT needs
  scopes `repo` + `workflow` (CI workflow files under `.github/workflows/` get pushed).
- **The assistant performs the push itself** using normal git once the user authorises it -
  `staging` on request, `main` only after explicit approval of the staging build. The keychain
  supplies the token, so there is no manual token entry or terminal step for the user; never
  fall back to the API-push script.
- Run `npm run typecheck`, `npm run lint`, and `npm test` before pushing. GitHub
  Actions CI enforces all three on every push to staging and main. Note: Next 16 no
  longer runs ESLint during `next build`, so a green Vercel build does NOT mean
  lint-clean - CI is the lint gate.
- **Vercel Hobby plan: max one cron schedule per day.** A more frequent schedule fails
  the entire deployment. Current crons: send-emails 8am, gdpr-cleanup 3am. Hobby crons are
  best-effort and CAN silently skip a run (a weekly send was missed this way). A cron-job.org
  job therefore also triggers send-emails daily as a backstop; the claim-lock makes the
  overlap safe, so keep both.
- **Off-Vercel callers (cron-job.org etc.) must use `https://www.radcliffe.run/...`**, not
  the apex. `radcliffe.run` 307-redirects to `www`, and external callers do not follow the
  redirect and drop the `Authorization` header across it. The cron routes authenticate via
  `Authorization: Bearer <CRON_SECRET>`.
- **`CRON_SECRET` is marked Sensitive in Vercel (write-only)** - you cannot read it back, and
  it is not in `.env.local`. If it is needed and not recorded, rotate it (set a new value in
  Vercel, redeploy, update every caller). Record the current value in the credentials
  document so next time is a copy-paste.
- Do NOT run `npm audit fix --force` - it downgrades Next.js to an ancient version.
- Tailwind v4: `@import "tailwindcss"` in globals.css, not `@tailwind base/components`.

## When adding a page or a third-party service

- **New public page:** add it to `app/sitemap.ts` (discoverability) and, if user-facing,
  to the nav (`components/layout/Nav.tsx`); give it a `metadata` export with a localised
  title and description ("... in Radcliffe / Bury"). The /walks page shipped without a
  sitemap entry once - do not repeat that.
- **Any UI change:** use the CSS variables (see Styling and theming) and test BOTH light and
  dark mode and BOTH mobile and desktop before shipping - several walks-page issues were
  dark-mode-only or mobile-only.
- **New third-party service** (tile provider, API, embed, analytics): if it receives visitor
  data, disclose it in the privacy policy services table (`app/privacy/page.tsx`) - e.g. map
  tile providers receive visitor IPs, so they belong there. `NEXT_PUBLIC_` keys must be set
  in Vercel before the build and must NOT be marked "Sensitive" (or they will not inline into
  the client bundle); they are exposed in the bundle, so restrict them by origin where the
  provider allows it.

## Environments

- `.env.local` points at the DEV Supabase project. Production credentials live in
  Vercel env vars and the production Supabase project. Local sends only ever touch dev
  data. `.env.production` in this repo has blank secrets - do not use it.
