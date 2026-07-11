# radcliffe.run architecture

Reference for how the site fits together. The hard rules distilled from this document
live in `AGENTS.md` - read that first. This file is the background and detail.

Last verified against production: June 2026.

---

## Overview

Next.js App Router site on Vercel, backed by Supabase (Postgres + auth), sending email
through Brevo, with DNS and inbound mail routing at Cloudflare.

```
Browser -> Vercel (Next.js) -> Supabase (dev or production project)
                            -> Brevo API (content email)
Supabase Auth -> Resend SMTP (login OTP / magic links - dashboard config, not code)
Cloudflare    -> DNS, Email Routing (hello@radcliffe.run forwards to group Gmail)
```

Two Supabase projects:

| | Project | Used by |
|---|---|---|
| Dev | `rnbiqxhlqjbahgiwabuv` | `.env.local`, localhost |
| Production | `qpdymxagloeghypntpct` | Vercel env vars, radcliffe.run |

The dev project is on the free tier and auto-pauses after ~7 days idle; restore it from
the Supabase dashboard if local dev cannot connect.

---

## Key directories

```
app/                  Pages (App Router). Public pages, /admin, /leader, /c25k, /api
components/           Shared components (AdminShell, Nav, ThemeProvider, ThemeMapImage)
lib/                  Core logic: brevo.ts, buildEmail.ts, sendScheduledEmail.ts,
                      unsubscribe.ts, routes.ts, groups.ts, supabase.ts, database.types.ts
utils/supabase/       client.ts (browser) and server.ts (user-JWT server client)
middleware.ts         Protects /admin/*
public/gpx/           GPX files, one per route slug
public/route-maps/    Dark route card webps; light/ subfolder for light theme
scripts/              generate_route_maps.py (dark + light webp generation)
supabase-*.sql        Schema + migration history (production schema:
                      supabase-schema-production.sql)
vercel.json           Cron config
```

Note: `AdminSidebar.tsx` exists but is unused - `AdminShell.tsx` is the active admin
layout.

---

## Database schema (summary)

Full DDL in `supabase-schema-production.sql`. Tables:

- **members** - the membership register. Notable columns: `email` (unique, the auth
  join key), `emergency_*`, `medical_info`, consent flags (`consent_data`,
  `health_declaration`, `consent_medical`, `photo_consent`, `email_opt_out`), `status`
  ('active'|'deactivated'), `is_run_leader`, `cohort` ('c25k' or null), `c25k_session`,
  `theme`, `font_size`, `deactivated_at`.
- **runs** - the schedule. `date`, `title`, `route_slug`, `terrain` ('road'|'trail'),
  `run_type` ('regular'|'social'|'c25k'|'walk'), `cancelled`, `on_tour`, `has_jeffing`,
  `strava_url`, `meeting_*`.
- **route_descriptions** - DB override layer for route names/descriptions (slug PK).
  `lib/routes.ts` is the static base; this table wins where present.
- **site_settings** - single-row config: hero image, email defaults, social calendar
  toggles, and all C25K settings (`c25k_enabled`, `c25k_registration_open`,
  `c25k_start_date`, `c25k_cohort_label`, `c25k_max_registrations`,
  `c25k_session_order`).
- **scheduled_emails** - newsletter drafts/schedule. `status`
  ('draft'|'scheduled'|'sent'|'cancelled'), content fields, `recipient_filter`
  ('all' | 'selected' | a cohort), `recipient_member_ids uuid[]`.
- **email_send_log** - per-recipient send outcomes.
- **push_subscriptions** - PWA web-push subscriptions (endpoint + keys, nullable
  `member_id`). News and roundups live in the **posts** table (`type` = 'news' |
  'roundup'); the standalone roundup_* tables were scaffolded on dev, never deployed to
  production, and dropped Jul 2026.

### RLS model

`members.id` is a random UUID, NOT the Supabase auth UUID. All member self-access is
matched by email:

```sql
USING ((SELECT auth.email()) = email)
```

with a supporting index on `members(email)`.

Active policies (production, hardened Jul 2026):

- **members**: anon INSERT (registration); authenticated read/write own row by email.
- **runs**: anon SELECT and authenticated SELECT (the homepage and join flow read runs
  with the member JWT). Writes are service-role only.
- **posts**: anon SELECT of published posts only. No authenticated grant (the app reads
  posts on the service role).
- **route_descriptions**: public SELECT only (writes are service-role).
- **site_settings**: anon SELECT; authenticated UPDATE. **push_subscriptions**: public
  INSERT/DELETE for the subscribe/unsubscribe flow.
- **scheduled_emails, email_send_log, email_snippets**: no policies at all - admin-only,
  read/written exclusively via `supabaseAdmin()`.

Everything else - admin pages, leader lookup, email sending - uses `supabaseAdmin()`
(service role key, `lib/supabase.ts`), which bypasses RLS entirely. See AGENTS.md for the
two invariants this enforces: `/api/admin/*` routes must call `requireAdmin()`, and
admin-only tables never get an `authenticated` policy (admin is an env allowlist, not a
DB role).

**RLS is version-controlled in `supabase-rls-baseline.sql`** (added 5 Jul 2026, hardened
same day). Policies live inside each Supabase project, not in code, and had never been
migrated - dev, production, and the old `supabase-schema-production.sql` snapshot had
drifted to three different `members` self-access policies (dev was on the broken
`auth.uid() = id` form). The baseline was created by capturing production's live policies
verbatim to reconcile that drift, then updated with the security hardening that narrowed
the over-broad `authenticated` grants (the state listed above). It is idempotent and
convergent (safe to apply to any project); dev and production now match byte-for-byte on
the 9 tables. Any future RLS change edits this file, is applied to BOTH projects, and is
verified with the `tests/access` harness.

The `tests/access` harness (`npm run test:access`) is the regression net for all
of this: it signs in as anon/member/leader/admin and asserts access at both the
RLS and API-route layers. Not part of `npm test`/CI. See `tests/access/README.md`.

Because the two Supabase projects are still edited by hand (no migration
pipeline), schema and RLS can drift again. `npm run db-diff`
(`scripts/db-diff.mjs`) is the automated detector: it connects to BOTH projects
read-only, introspects the `public` schema (tables, columns, indexes,
constraints, RLS policies, per-table RLS-enabled) and exits non-zero on any
difference, so it can gate a scheduled run. It needs a Postgres connection string
per project (`DBDIFF_DEV_DB_URL` / `DBDIFF_PROD_DB_URL`) because the service-role
key + JS client cannot read the catalogs. `supabase-rls-baseline.sql` remains the
canonical desired RLS state you reconcile back to; `db-diff` is what surfaces the
drift. See `tests/access/README.md`. Its first live run (6 Jul 2026) found 14
schema-level drifts (column nullability/defaults/types, a dev-only `'mixed'`
terrain value in the `runs` check constraint, a prod-only unique constraint);
dev was aligned to production the same day
(`supabase-migration-dev-schema-align.sql`) and both projects now match on all
six categories. Note `runs.terrain` allows only `'road'`/`'trail'` - a sheet row
marked "Mixed" will fail the runs sync in both environments.

### Native app tables (Jul 2026)

Added for the native app (`apps/rtr` in the native-apps monorepo; scope in
`docs/NATIVE_APP_SCOPE.md`). All three are service-role only - RLS enabled,
NO policies (the admin-table rule: leader identity is `is_run_leader` checked
server-side, not a Postgres role):

- `attendance` - the check-in system of record (leader one-tap register).
  `run_id` FK -> runs (CASCADE), `member_id` FK -> members (CASCADE - GDPR
  cleanup erases the trail), `recorded_by` FK -> members (SET NULL),
  `source` 'leader'|'self_report', `group_key` '8k'|'5k'|'jeff',
  `UNIQUE(run_id, member_id)` makes re-taps/offline replays idempotent.
  Everything the v1.1 award ladder needs is derivable from this table
  (`supabase-migration-attendance.sql`).
- `push_tokens` - Expo push tokens (iOS + Android), nullable `member_id`
  (CASCADE), `prefs` jsonb `{weekly, alerts}`, `last_seen_at` (GDPR cron
  prunes > 1 year unseen). Registered via `POST /api/push/register`
  (`supabase-migration-push-tokens.sql`).
- `push_send_log` - idempotency claim-lock for automated pushes:
  `UNIQUE(kind, ref_date)`; the insert IS the claim.

Native-app API surface (all in this repo): `GET /api/routes` (public
catalogue - static `lib/routes.ts` merged with `route_descriptions`, light
map webp URLs), `GET /api/leader/contacts` (full active-member emergency set
for the app's encrypted offline cache), `GET /api/leader/register?run_id=`
(check-in roster + counters), `POST /api/leader/checkin` (idempotent
attendance upsert/delete), `POST/DELETE /api/push/register`,
`GET /api/cron/send-push` (Thursday announcement; cron-job.org, CRON_SECRET,
claim-locked), `GET /api/attendance/summary` (member's own lifetime ladders),
`GET /api/home` (personalised home aggregate), `GET /api/walks` (public
walks catalogue - see "Runner home" below). `lib/apiAuth.ts` adds
Bearer-token auth (`getUserFromRequest`, `requireLeader`): every route above
accepts `Authorization: Bearer <supabase access token>` alongside session
cookies; `/api/profile` PATCH/DELETE gained the same so the in-app
account-deletion screen reuses the web logic.
`lib/expoPush.ts` mirrors `lib/brevo.ts` (never throws, prunes
DeviceNotRegistered tokens); `/api/admin/notify` now broadcasts to web-push
AND Expo tokens with per-channel reach counts. `middleware.ts` answers CORS
preflight and stamps CORS headers on the app-facing API paths (native fetch
ignores CORS - this exists for the app's browser-preview verification loop;
auth is still enforced per-route).

### Attendance recognition (Jul 2026)

The counting + milestone layer over `attendance` (parkrun model; full decision
record in `docs/ATTENDANCE_RECOGNITION_BRIEF.md`). Two lifetime counters per
member - RUN and VOLUNTEER - with rungs at 10/25/50/100 then every 100th.
Three more service-role-only tables (RLS enabled, NO policies -
`supabase-migration-attendance-recognition.sql`):

- `attendance_seeds` - era-1 offsets for history that predates the site's
  records: the old-site check-in export (runs, as of 7 May 2026 - the legacy
  site's last counted run) and the
  WhatsApp leader availability polls (volunteer AND run credit, through
  9 Jul 2026), plus `source='manual'` for by-exception adjustments.
  `UNIQUE(member_id, kind, source)` keeps the importer idempotent.
- `run_leadership` - volunteer credit: "this leader was at this night as a
  leader". Written automatically by `POST /api/leader/checkin` when the
  checked-in member has `is_run_leader` (leading implies attending); the rare
  ran-but-didn't-lead night is corrected by deleting that night's row.
  Keyed like attendance: anchor `run_id` + optional `group_key`.
- `awards` - crossed rungs, `UNIQUE(member_id, kind, rung)`; `achieved_on`
  NULL means "crossed inside the seed era" (undatable); `notified_at` makes
  the recognition loop fire once.

Counting rules (implemented in `lib/recognition.ts`, exposed by
`GET /api/attendance/summary` - member self-only, cookie or Bearer):

- The unit is a NIGHT: `COUNT(DISTINCT runs.date)`, never attendance rows
  (8k hangs off the 5k anchor row; Jeffing has no row at all).
- Qualifying runs: `run_type IN ('regular','c25k')`, not cancelled. Socials
  and walks never count; on-tour counts.
- Lifetime total = sum of seeds + distinct recorded nights.
- `members.awards_public` (default false) is the opt-in consent flag for
  public celebration; the summary endpoint only ever returns the caller's own
  counts. Members toggle it via `PATCH /api/profile`
  (`{ "awards_public": true|false }` - whitelisted 11 Jul 2026; cookie or
  Bearer, self-only like every profile field).

Backfill: `scripts/import_attendance_seeds.py` (dry-run by default,
idempotent, re-runnable). Sources live in `data/attendance-backfill/` +
`data/leader-polls/` - both gitignored (names/emails/phone ids; the repo is
public). People in the sources who never registered are reported but NEVER
written to the DB (GDPR minimisation) - re-running the import attaches them
if they register later. The era-2 gap (14 May - 9 Jul 2026, reconstructed from
run photos) imports as real `attendance` rows (`source='photo'`,
ignore-duplicates so live rows always win) and must NOT create
`run_leadership` rows - leader history through 9 Jul is already covered by
the polls seed.

### Runner home (Jul 2026)

Backend for the personalised home screen (decision record:
`docs/RUNNER_HOME_BRIEF.md`; API list also mirrored in
`docs/NATIVE_APP_SCOPE.md` section 5). Backend-first: every surface is
server-derived in `lib/home.ts`, the app never re-derives.

- `members.development_preference` - nullable text, `CHECK IN
  ('get_fitter', 'run_further', 'first_race', 'enjoy_thursdays')`
  (`supabase-migration-runner-home.sql`). The development-preference ask:
  skippable, editable forever via `PATCH /api/profile` (whitelisted
  alongside `awards_public`), app-only for now (no email use).
- `GET /api/home` - member-authed aggregate (cookie or Bearer). 401 signed
  out, 404 signed-in with no active member row. Returns `firstName`,
  `isRunLeader`, `usualGroup` + `groupCounts`, `collectiveStat`,
  `developmentPreference`. `usualGroup` is the majority
  `attendance.group_key` over live-era check-ins (`group_key IS NOT NULL`
  IS the live-era filter - photo-era backfill mostly lacks it); null until
  3+ check-ins AND a strict majority (cold start and no-majority render the
  same equal tiles), leader-inclusive by design. `collectiveStat` is
  distinct members checked in on the most recent qualifying run date
  (`run_type IN ('regular','c25k')`, not cancelled - the counting
  invariant); a cancelled week keeps showing the previous run, never a zero
  state. Does not duplicate `GET /api/attendance/summary` (the header
  badge's source).
- `GET /api/walks` - anon read, mirrors `GET /api/routes`'s trust level; a
  tiny projection of `lib/walks.ts` for the app's solo card. Draft heritage
  `stages` content is deliberately left out of the payload.

Which client to use:

| Context | Client |
|---|---|
| Admin pages, leader pages, API routes acting on all members | `supabaseAdmin()` |
| Member self-access (profile page etc.) | `createClient()` from `utils/supabase/server.ts` |
| Browser | `utils/supabase/client.ts` |

---

## Auth

Magic link + OTP via Supabase Auth. `/auth/callback` must handle BOTH flows:

```typescript
if (token_hash && type) await supabase.auth.verifyOtp({ token_hash, type })
if (code)              await supabase.auth.exchangeCodeForSession(code)
```

Admin login (`/admin/login`) uses a numeric OTP code; the Supabase email template must
contain `{{ .Token }}` (not `{{ .ConfirmationURL }}`), and `signInWithOtp` must NOT
pass `emailRedirectTo`. `middleware.ts` gates `/admin/*`; admin identity comes from the
`ADMIN_EMAILS` env var.

Auth emails ("Your access code", magic links) are delivered by Supabase Auth through
Resend SMTP configured in the Supabase dashboard (Authentication -> Emails -> SMTP).
This is invisible to this codebase. Consequences:

- Closing the Resend account or deleting the `resend._domainkey` DNS record breaks
  sign-in for everyone.
- The planned consolidation is to repoint Supabase SMTP at Brevo
  (`smtp-relay.brevo.com:587`) and then retire Resend.

---

## Email system

### Pipeline

1. Admin composes in `/admin/emails` (EmailComposer). Draft saved to
   `scheduled_emails`.
2. Send happens either manually (`POST /api/admin/emails/[id]/send`) or by the daily
   cron (`GET /api/cron/send-emails`, 8am UTC). Both call `lib/sendScheduledEmail.ts`
   directly - the cron must NOT fetch an internal HTTP route (that timed out on the
   Vercel Hobby plan and left emails stuck in "scheduled").
3. `sendScheduledEmail.ts`: load email -> enrich with that week's runs -> resolve
   recipients -> build HTML/text via `lib/buildEmail.ts` -> send ONE Brevo request per
   member with bounded concurrency 5 -> log to `email_send_log` -> mark sent only if at
   least one send succeeded (total failure leaves it 'scheduled' so the next cron run
   retries; partial success marks sent so delivered members are not re-emailed).
4. `lib/brevo.ts` is the single shared sender for ALL content email (newsletter,
   welcome email in `app/api/join/route.ts`, contact form in
   `app/api/contact/route.ts`). It never throws; it returns
   `{ ok, status, messageId, error }`.

Per-member sending (not batch) is deliberate: Brevo's `messageVersions` cannot vary
`htmlContent` or custom headers per recipient, and each member needs a personalised
unsubscribe URL and `List-Unsubscribe` header. The send and cron routes set
`export const maxDuration = 60` so a full membership send cannot time out mid-loop.

### Recipient selection

`scheduled_emails.recipient_filter`:

- `'all'` - every active, non-opted-out member.
- `'selected'` - exactly the ids in `recipient_member_ids` (picked via the searchable
  MemberPicker in the composer). Send re-filters to active + not opted out. Also the
  safe way to do a staged first send (pick yourself).
- A cohort value (e.g. `'c25k'`) - UI option still disabled, pending the cohorts
  feature.

### Email content rules

- `lib/buildEmail.ts` builds table-based HTML with a light palette (outer `#f0f0f0`,
  card `#ffffff`, orange `#f5a623`) for email client compatibility - NOT the dark site
  theme.
- Run titles/descriptions are HTML-escaped (they originate from Google Sheets).
- Route links must be `/routes#<slug>` (see AGENTS.md - path-style links 404).
- The `{{UNSUBSCRIBE_URL}}` placeholder is replaced per member at send time.
- Same-route merge (mirrors the homepage): when two runs on the same Thursday share a
  `route_slug` OR a `title` (e.g. the 5k and 8k running the same loop), `buildEmail.ts`
  collapses them into ONE block - header lists both distances (`5km & 8km`), one
  description, one route link (to the longer run). Keep this rule in step with the
  homepage's merge in `app/page.tsx` if either changes. Genuinely different routes on the
  same date still render as separate blocks.

### Unsubscribe

Shared HMAC logic in `lib/unsubscribe.ts` (`makeUnsubscribeToken`,
`verifyUnsubscribeToken`, `optOutMember`), keyed by `UNSUBSCRIBE_SECRET`.

- In-body link -> `/unsubscribe` page (friendly confirmation, opts out on GET).
- `List-Unsubscribe` header -> `/api/unsubscribe` (POST = one-click opt-out from the
  mail client; GET = redirect to the page). A `page.tsx` cannot handle POST, hence the
  separate API route.

Both paths set `members.email_opt_out`, keeping our DB the source of truth. Brevo
respects the custom header (verified June 2026) and adds `List-Unsubscribe-Post`.

### DNS and deliverability (Cloudflare)

- Inbound: Cloudflare Email Routing. `hello@radcliffe.run` is NOT a mailbox - it
  forwards to the group Gmail. The contact form sends from hello@ TO hello@; DKIM
  survives the forward so Gmail records a DMARC pass.
- Outbound DKIM, two providers coexist: Brevo (`brevo1`/`brevo2._domainkey`, content)
  and Resend (`resend._domainkey`, Supabase auth). Neither appears in the root SPF;
  both authenticate via their own return path + DKIM.
- Brevo free tier: 300 emails/day, no monthly cap, no branding on transactional sends.
  Revisit (PAYG credits) only near ~250-280 members.

---

## Theming

Light theme + font size are per-member preferences (`members.theme`,
`members.font_size`), applied as CSS custom properties set via JavaScript - not
Tailwind classes (Tailwind v4 layer interactions defeat selector-based overrides).

Three synchronised locations (see AGENTS.md):

1. `components/ThemeProvider.tsx` - `LIGHT_VARS`, applied after hydration from
   localStorage; `applyTheme` also called directly by the profile toggle.
2. `app/layout.tsx` - inline anti-flash `<script>` in `<head>` applies the same vars
   pre-hydration (the `lv` object).
3. `app/globals.css` - `[data-theme="light"]` fallback block + `:root` dark defaults.

Font size vars: `--text-xs` 11/13px, `--text-sm` 13/15px, `--text-base` 14/16px,
`--text-md` 15/17px (normal/large).

Intentionally hardcoded (do not convert to vars): terrain section backgrounds, C25K
gradients and session accents, error reds, map polyline colours, Strava orange.

Route map imagery: every route has a dark webp and a light webp;
`components/ThemeMapImage.tsx` swaps between them via a MutationObserver on
`data-theme`.

---

## Runs, routes, and sync

- `lib/routes.ts` - static route catalogue (slug, distance, terrain, GPX path,
  description, Strava URL). `route_descriptions` table overrides names/descriptions.
- `POST /api/admin/runs/sync` upserts upcoming runs from two Google Sheets (Thursday
  schedule + social calendar), preserving `cancelled` and `has_jeffing`, and upserts
  route names into `route_descriptions`.
- **On-tour meeting map links.** The Thursday sheet's "On tour meeting location map"
  column holds a Google Maps share URL (also read by an external calendar Apps Script
  and the Abingdon app - see `AGENTS.md`, do not change its format). At sync time,
  `lib/mapLink.ts`'s `resolveMapCoords()` follows short-link redirects and extracts the
  lat/lng pin, cached on the run row as `meeting_lat`/`meeting_lng`. The run detail page
  (`app/runs/[id]/page.tsx`) passes those coordinates plus the original URL to
  `components/DirectionsLink.tsx`, which opens Apple Maps on iOS (`maps.apple.com`,
  exact pin via `ll=`) and the Google Maps URL everywhere else - a plain click-time
  user-agent check, since Apple Maps can't parse a Google Maps URL and free-text
  address search can geocode to the wrong nearby place.
- Homepage merges the two Thursday group rows into one card when they share date and
  slug/title. Route card images are checked with `existsSync` against
  `public/route-maps/<slug>.webp` (webp, not png).
- A run's `strava_url` takes priority over the `lib/routes.ts` fallback - when
  repointing a run to a new route, update BOTH `route_slug` and `strava_url` on the run
  row.

### Adding a route

1. Copy GPX to `public/gpx/<slug>.gpx` (slug format: `{category}--{kebab-name}`).
2. Generate both map images:
   `python3 scripts/generate_route_maps.py <slug>` and
   `python3 scripts/generate_route_maps.py --theme light <slug>`
   (OSM tiles + staticmap; CartoDB washes out rural areas).
3. Add the entry to `lib/routes.ts` (no apostrophes or em dashes in descriptions).
4. Ship GPX + both webps + routes.ts together.
5. Update the run row in Supabase: `route_slug` AND `strava_url`.

---

## Cron

Vercel Hobby allows at most ONE schedule per cron job per day; anything more frequent
fails the whole deployment. Current jobs (`vercel.json`), authenticated via
`CRON_SECRET`:

- `0 8 * * *` `/api/cron/send-emails` - due scheduled newsletters.
- `0 3 * * *` `/api/cron/gdpr-cleanup` - purges members deactivated > 1 year and old
  send logs (the retention promises in the privacy policy are enforced here).

Because of the one-per-day limit, future scheduled work (e.g. leader nudges) must fold
into the existing 8am job rather than adding a schedule.

`GET /api/cron/send-push` (the Thursday ~4pm native run announcement) is NOT a
Vercel cron for this reason - cron-job.org calls it at
`https://www.radcliffe.run/api/cron/send-push` (www host, Bearer CRON_SECRET).
It is idempotent via the `push_send_log` claim-lock, so retries cannot
double-send. The gdpr-cleanup cron also prunes `push_tokens` unseen > 1 year.

---

## Environments and configuration

### Env vars

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dev project in `.env.local`, production in Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Powers `supabaseAdmin()` |
| `ADMIN_EMAILS` | Comma-separated admin allowlist |
| `BREVO_API_KEY` | Content email. Replaced `RESEND_API_KEY` (June 2026) |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | hello@radcliffe.run / Run Together Radcliffe |
| `UNSUBSCRIBE_SECRET` | HMAC key for unsubscribe tokens |
| `NEXT_PUBLIC_SITE_URL` | localhost:3000 locally, https://radcliffe.run in production |
| `CRON_SECRET` | Vercel cron auth (production only) |

Supabase keys are the legacy JWT format (`eyJ...`), from the Legacy tab in Supabase
API settings - not the newer `sb_publishable_`/`sb_secret_` format.

Do not create a `.env.production` - production secrets live only in Vercel and in
Paul's local credentials document.

### Privacy

`app/privacy/page.tsx` lists data sub-processors (Supabase, Brevo, Vercel...). Keep it
accurate when providers change - it is a GDPR commitment, not marketing copy.

---

## Deployment workflow

1. Branch from fresh `origin/main`. Never reuse a stale branch: a branch cut from old
   main once nearly reverted a live fix when it was deployed.
2. Make the change; run `npm run lint` and `npx tsc --noEmit` (unused variables fail
   the Vercel build).
3. Schema check: if any changed file references a new column/table, apply the
   migration to production Supabase FIRST. `app/api/join/route.ts` is the critical
   case (see AGENTS.md).
4. Push the branch to `staging` - Vercel produces a preview URL.
5. Explicit approval on the preview, then merge `staging` -> `main`. Vercel deploys
   production from `main`.

### Git hygiene

Historically some changes were pushed to GitHub via the API without local commits,
leaving the local working tree's git state misleading (files shown "modified" that
were already live). The local tree was reset to `origin/main` in June 2026. From now
on: all changes are real commits, made on branches cut from fresh `origin/main`,
merged via `staging`. If local state ever looks confusing, trust GitHub:
`git fetch origin && git diff origin/main` before assuming anything is unshipped work.

---

## Known gotchas (quick list)

- Dev Supabase project auto-pauses after ~7 days idle (free tier) - restore from
  dashboard.
- `npm audit fix --force` downgrades Next.js catastrophically - never run it.
- Dev server: run from the project root (worktree paths break hydration) and use
  `localhost`, not `127.0.0.1` (blocked by Next.js 16).
- Magic-link auth callback must handle both `token_hash` and `code` (see Auth).
- Em dashes are banned in source files; they also break Edit-tool string matching in
  files that already contain them.
- The roundup page still reads static `lib/roundup.ts` (wiring to DB is backlog).
- PWA push notifications are unbuilt (needs a Supabase Edge Function; Vercel Hobby's
  10s function limit is too short).
