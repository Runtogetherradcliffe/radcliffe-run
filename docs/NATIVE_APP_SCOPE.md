# radcliffe.run native app (iOS + Android) - scoping document

Status: **proposed** (drafted 5 Jul 2026; revised same day after Paul's steer:
leaders are the first users, so leader emergency contacts and local-only
breadcrumb route tracking move into v1, and the membership numbers are
corrected - ~100 currently registered, 30-40 weekly attendees; the ~600 figure
was the old site's all-time register). Analysis only - no build has started and
no site code changes accompany this document.

Revised 6 Jul 2026 after the C25K engagement workshop and timeline planning
(workshop decisions in `docs/C25K_ENGAGEMENT_RESEARCH.md`): registration and
attendance check-in move INTO v1, Android becomes first-class alongside iOS,
and section 9 fixes the calendar. Where an earlier section conflicts with
section 9, section 9 wins.

This is Phase N4 of the native roadmap
(`/Users/paulcox/Abingdon app/docs/NATIVE_ROADMAP.md`), pulled forward now that the
Expo/EAS workflow exists (two apps built in `/Users/paulcox/native-apps`). RTR is a
different beast from those two: public, multi-user, other runners' expectations, and
external TestFlight distribution means Beta App Review. This document makes every
question explicit before any build starts. Decisions belong to Paul - and as of the
6 Jul 2026 decision workshop they are ALL made: section 8 is now the settled record,
with no open questions remaining anywhere in this document or the research doc.

Everything below was verified against the codebase and the production Supabase
project (`qpdymxagloeghypntpct`) on 5 Jul 2026.

---

## 1. The v1 cut

### What the site does today (full inventory)

| Area | Pages / routes | Notes |
|---|---|---|
| Run schedule | `/` (run cards), `/runs/[id]` (detail: map, GPX, directions) | Synced from Google Sheets; anon-readable in DB |
| Routes library | `/routes` (+ hash-selected detail), 71+ routes | Static catalogue `lib/routes.ts` + `route_descriptions` DB overrides; GPX + dark/light webp per route; layer picker incl. historic maps |
| Walks | `/walks` | Curated self-guided walks, static data `lib/walks.ts` |
| News / roundups | `/news`, `/news/[slug]` | `posts` table, admin-published, photo galleries |
| Registration | `/join` (multi-step, GDPR consents), `/c25k/join` | INSERTs into `members`; welcome email via Brevo |
| Sign-in | `/signin` (8-digit email OTP), `/auth/callback` | Supabase Auth; no passwords, no social login |
| Profile | `/profile` | Edit details, theme/font prefs, web-push toggle, **delete account** |
| C25K | `/c25k`, `/c25k/programme` | 10-week programme, auth-gated programme page |
| Leader area | `/leader` (emergency contacts), `/leader/c25k` (roster) | Gated on `is_run_leader` |
| Admin | `/admin/*` (members, runs, routes, emails, posts, snippets, notify, settings) | Gated on `ADMIN_EMAILS` via middleware |
| Email | Newsletter composer + Brevo pipeline + cron | Entirely server-side |
| PWA | manifest, `public/sw.js`, offline page, **web push already part-built** | See section 2 |

### Working hypothesis: native v1 = schedule + routes + push

**The audit supports the hypothesis, and suggests sharpening it further: v1 can ship
with no sign-in at all.**

What a member (not Paul) actually gains from an app over the website:

1. **Push on the lock screen - the killer feature, and the framing holds up.**
   The site already has web push built (opt-in banner, `push_subscriptions` table,
   admin send UI at `/admin/notify`). But web push on iOS only works when the PWA
   has been added to the home screen (iOS 16.4+), which almost no member will have
   done - so for the iOS-majority membership, "Thursday is On Tour - Ainsworth,
   7pm" on the lock screen is effectively **impossible today and trivial with a
   native app**. This is the one thing the website categorically cannot do for
   them. Cancellation alerts are the highest-value single case: a run called off
   at 5pm currently relies on Facebook/WhatsApp reach.
2. **Faster weekly glance.** Open app, see Thursday's run(s), route map, meeting
   point, one tap to Apple Maps directions (the site already resolves exact
   coordinates for on-tour runs - `meeting_lat`/`meeting_lng`). An app icon beats
   typing a URL, and cached data beats a page load on a poor connection.
3. **Routes in the pocket.** The GPX library with offline-cached maps is genuinely
   useful mid-run or when route-planning, and the app can cache what the browser
   re-fetches.

What members do NOT need natively: registration (once, ever), profile edits (rare),
C25K programme reading (10 weeks then done), news reading (fine in browser), and
all admin tooling (that is Paul, and the web admin is good).

### Leaders are the first users - and that reshapes the cut

The rollout Paul envisages is rings: himself first, then a handful of run
leaders, then the wider membership. That makes leaders the app's first real
audience, and the leader job contains the single most app-shaped task on the
site: **emergency contact lookup during an incident**. A leader standing on a
towpath with one hand on a phone needs a member's emergency contact and medical
notes in seconds - today that means finding radcliffe.run/leader in Safari,
re-authenticating if the session lapsed, and hoping for signal. Native fixes all
three: an icon, a session that persists indefinitely, and (optionally) a
contacts cache on the device. One-tap dialling of the emergency number is the
kind of detail that matters in the moment.

The second leader-shaped gain is **mapping that survives the screen turning
off**. The PWA already shows a live "you are here" dot on the route map; what
it cannot do is keep tracking once the screen is off, so there is no trail - a
leader who pockets the phone re-orients from scratch at every glance. The
native win is a **breadcrumb trail**: a "track this run" control on the route
map starts background location updates, the phone records with the screen off,
and every glance shows the planned GPX line, the path actually run, and current
position. Two design choices keep it cheap and clean:

- **Local-only.** The trail never leaves the device - no upload, no sharing,
  no server. That removes the member-consent question entirely (a leader's own
  phone recording the leader's own location for their own map) and keeps the
  App Privacy label clean (Apple counts data as "collected" only when it is
  transmitted off the device).
- **Session-scoped, not "Always".** iOS lets background location continue from
  a foreground start under the standard While-Using permission plus the
  location background mode, with the visible blue indicator - the Strava
  pattern. No "Always" permission request, no silent-tracking optics.

It is still the most involved single feature in v1 (expo-location background
task via TaskManager, start/stop/auto-stop lifecycle, battery testing) rather
than a freebie, so it is sequenced as internal-TestFlight-ring work (section 7),
where no Apple review exists while it is iterated. Review risk is low even
after that: Beta App Review of a run-tracking feature in a running club app,
with a clear purpose string and the local-only design, is routine fitness-app
territory. What stays OUT is *sharing* the trail - live leader-to-leader
position needs a backend and a consent story (see the OUT list).

For everyone else, the three member surfaces (schedule, routes, push) still work
**without any account**:

- `runs`, `route_descriptions`, `site_settings` are anon-readable in production
  RLS today (verified 5 Jul 2026).
- Push tokens do not need a member identity - the existing web
  `push_subscriptions` table already treats the member link as optional
  (`member_id` nullable).
- The route catalogue, GPX files and map images are served publicly by the site.

**Recommendation: v1 = schedule + routes + push for everyone (no login wall),
plus optional sign-in that unlocks a leader area (emergency contact lookup) for
`is_run_leader` members.**

A regular member never sees a login screen, which keeps the review surface small
and the value immediate; sign-in lives quietly in the Club tab. What including
the leader mode costs:

- The OTP sign-in flow moves from v1.1 into v1 (section 3 - a small, known
  quantity; native OTP auto-fill actually beats the web experience).
- A Bearer-token path for a leader-contacts endpoint - the app must NEVER hold
  the service-role key, and this should NOT be an RLS grant on `members`
  (section 5 has the access pattern).
- The in-app account-deletion obligation arguably triggers once sign-in exists;
  the capability is already built on web and the native screen is cheap
  (sections 3 and 4).
- Beta App Review eventually needs review notes + a demo account - but the
  staged rollout defers that entirely: Paul and the first leaders fit inside
  internal TestFlight, which has NO Beta App Review. Apple first sees the app at
  the external-tester stage, by which time the leader mode is mature (sections
  4 and 7).

Push value arrives with the widest ring; leader value arrives with the first
ring. Each rollout stage gets its own killer feature, which is a healthier shape
than an app whose payoff only appears at full distribution.

### Explicitly OUT of v1

- Profile editing and account management screens (v1.1 candidate - sign-in
  itself is IN v1 for the leader area; account deletion excepted, see section 3)
- C25K (programme page stays web; C25K runs still appear in the schedule feed)
- News / roundups (v1.1 candidate - it is anon-readable content, cheap to add)
- Walks
- Leader C25K roster (seasonal) and the designed-but-unbuilt run-leader signup
  feature - the leader area in v1 is emergency contact lookup only
- Admin (everything)
- Email management
- Shared live location (leader-to-leader position, any member tracking) and
  off-route alerts. The local-only breadcrumb trail IS in scope (section 1);
  transmitting anyone's position off the device is not - that needs a location
  pub/sub backend, a real consent story, and it is the version that draws
  App Review and GDPR scrutiny
- HealthKit, widgets, Strava integration, run *recording* as a product (splits,
  uploads, history - RTR is not a tracking app; Strava owns that. The
  breadcrumb is navigation aid, not a recorded artefact: it is discarded, not
  kept)

### Amended 6 Jul 2026 (workshop + timeline - see section 9)

Two items originally cut from v1 moved INTO scope, and one new feature joined:

- **Registration is IN v1** (was: deep-link to `radcliffe.run/join` in Safari,
  per the "members do NOT need registration natively" reasoning above - now
  superseded). The app becomes the member-facing home for C25K progress, and
  the January 2027 cohort registers on it. The native form submits to the same
  `/api/join` backend, so the members-table invariants (AGENTS.md) are
  unchanged.
- **Attendance check-in is IN v1** - the leader one-tap register decided at
  the C25K workshop (`docs/C25K_ENGAGEMENT_RESEARCH.md`, check-in not booking).
  It launches for **normal club runs FIRST** (live by early September 2026,
  before 19 Sep), so the mechanic is proven on regulars a full season before
  the C25K cohort depends on it.
- **Android is IN v1 as a first-class platform** (was: door left open via
  Expo). Section 9 lists what that adds to the build.

---

## 2. Push architecture

### What exists today (more than the docs said)

The skill/docs say "push notifications unbuilt", but the codebase has a working
**web-push** layer:

- `components/NotificationOptIn.tsx` - opt-in banner, subscribes via the service
  worker, VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, in
  Vercel, not `.env.local`).
- `POST /api/push/subscribe` - upserts into `push_subscriptions` (endpoint,
  p256dh, auth, nullable `member_id`), delete on unsubscribe.
- `POST /api/admin/notify` + `/admin/notify` UI - manual broadcast via the
  `web-push` npm package, with 404/410 cleanup.
- `/profile` has a push toggle; `DELETE /api/profile` cleans up the member's
  subscriptions.

So the *product* pattern (opt in, store token, admin sends broadcast) is already
established; the native work is a second token type and real triggers, not a
green-field system. Note: `/api/admin/notify` currently gates on "any signed-in
user", not admin - see section 5, this must be fixed regardless.

### Expo Push vs raw APNs

**Recommendation: Expo Push.**

| | Expo Push | Raw APNs |
|---|---|---|
| Server work | One HTTPS POST to `exp.host`, batch 100 tokens per request | JWT signing with an APNs key, HTTP/2, per-device sends |
| Credentials | None in our code (EAS manages APNs certs) | APNs .p8 key stored + rotated by us |
| Fits the stack | Plain `fetch` from a Next.js route, same shape as `lib/brevo.ts` | New dependency + key management on Vercel |
| Receipts | Ticket/receipt API tells us about dead tokens | 410 handling similar |
| Lock-in | Mild (token format); swap-out path exists via `getDevicePushTokenAsync` | None |

At ~100 registered members (30-40 weekly attendees), a full broadcast is one or
two HTTP requests - comfortably inside a Vercel route with `maxDuration = 60` (the email
pipeline already uses this pattern). Raw APNs buys nothing at this scale and costs
key management. The old note "push needs a Supabase Edge Function because Vercel
10s is too short" was written about per-subscriber web-push loops; it does not
apply to batched Expo sends, and web-push delivery already runs on Vercel today.

### Where triggers live

**Recommendation: everything in the Next.js app on Vercel** - same place as the
email pipeline, sharing `supabaseAdmin()` and the claim-lock/cron patterns. A
Supabase Edge Function adds a second deploy surface for no gain. A new
`lib/push.ts` mirrors `lib/brevo.ts` (never throws, returns per-token outcomes,
prunes dead tokens).

Trigger paths, by event:

| Event | Trigger | Timing |
|---|---|---|
| Weekly run announcement ("Tonight: Outwood Trail, 5k & 8k, 7pm Radcliffe Market" / on-tour variant with location) | Cron route reading `runs` for today | Thursday afternoon (see below) |
| Cancellation ("Tonight's run is CANCELLED") | Fired from the admin runs UI when `cancelled` is toggled (explicit confirm, not silent side-effect) | Immediate |
| On-tour reminder (could be folded into the weekly announcement) | Same cron | Same |
| Ad-hoc broadcast | `/admin/notify`, extended to send to both web-push and Expo tokens | Manual |
| Later: news roundup published, C25K session reminders | Post-publish hook / cron | v1.1+ |

**The cron timing problem:** a "tonight" push wants to land Thursday afternoon
(~4pm), but Vercel Hobby is already at its cron budget (8am send-emails, 3am
gdpr-cleanup) and Hobby crons can silently skip. The established answer already
exists in this repo: **cron-job.org calls a new
`https://www.radcliffe.run/api/cron/send-push` route** (Bearer `CRON_SECRET`, www
host - both rules from AGENTS.md) at the chosen time on Thursdays. The route is
idempotent (stamps a sent-marker per run/date, claim-lock style) so a second
trigger cannot double-send. No new Vercel cron needed.

### Token storage

**Recommendation: a new `push_tokens` table**, not overloading `push_subscriptions`
(whose columns are web-push-shaped: endpoint/p256dh/auth):

```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,          -- ExponentPushToken[...]
  platform text NOT NULL,             -- 'ios' (android-ready)
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,  -- null until sign-in exists
  prefs jsonb NOT NULL DEFAULT '{"weekly": true, "alerts": true}',
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);
```

Registration goes through a Next.js API route (`POST /api/push/register`, mirroring
`/api/push/subscribe`), not direct PostgREST writes - keeps validation server-side
and avoids adding INSERT policies. The GDPR cron gains a clause pruning tokens not
seen for ~12 months; the delete-account path already cleans up web subscriptions
and gains the same for `push_tokens` (the FK cascade covers linked rows anyway).

### Opt-in and preferences

- iOS permission must be requested in context: a primer screen ("Get a heads-up
  about Thursday's run and any cancellations") before the system prompt, since a
  declined system prompt cannot be re-shown.
- v1 preferences: two toggles - **weekly announcement** and **alerts**
  (cancellations / on-tour changes) - stored in `push_tokens.prefs`, per device.
  Deliberately no finer grain until someone asks.
- The send route filters on prefs per event type.

### How a run leader sends one (admin tooling)

v1: **only Paul/admins send**, via the existing `/admin/notify` page extended to
(a) send to web + Expo tokens together, (b) offer templates (cancellation,
on-tour, custom), (c) show reach counts per channel. The weekly announcement is
automatic, so the manual path is only for exceptions.

The question that needs Paul's decision: should run leaders (not just admins) be
able to send a cancellation push from their phone at 6:30pm? If yes, that is a new
leader-gated page (`/leader/notify`, checking `is_run_leader`) with a
cancellation-only template - deliberately not free-text broadcast. Web-first
either way; it does not block the app.

---

## 3. Auth + accounts in native

### How site auth works today

- Members: `/signin` sends an **8-digit email OTP** via `signInWithOtp` (after a
  server-side membership check at `/api/check-member`); `verifyOtp` completes it.
  No passwords. No social logins. Magic-link and OTP both supported by the
  callback, but the member UX is the code flow.
- Admin: same OTP mechanic at `/admin/login`; identity = `ADMIN_EMAILS` env var.
- OTP delivery: Supabase Auth -> Resend SMTP (dashboard config, invisible to the
  codebase - the AGENTS.md invariant about not touching Resend stands).
- Sessions: cookie-based on web via `@supabase/ssr`.

### What that becomes in-app (v1, for the leader area)

- `supabase-js` works in React Native; sessions persist in `expo-secure-store`
  (same pattern as the other apps' token storage) and refresh silently -
  effectively sign-in-once, which is *better* UX than the website.
- The UX is the same two-step: email -> code. Native niceties: `textContentType="oneTimeCode"`
  gives auto-fill from the Mail app.
- The membership pre-check (`/api/check-member`) is a public endpoint and works
  unchanged.

### Sign in with Apple: NOT required

App Review Guideline 4.8 (Login Services) requires an equivalent-privacy login
option **only when the app uses a third-party or social login service** (Google,
Facebook, etc.). First-party email OTP does not trigger it. As long as RTR never
adds "Sign in with Google", no Apple sign-in work is needed. Worth stating in the
doc because adding a social login later would drag this requirement in.

### In-app account deletion (Guideline 5.1.1(v))

The obligation applies to apps that support **account creation**. With the v1
cut, sign-in is in the app but account creation stays web-only - strictly the
guideline is not triggered, but reviewers apply it broadly and arguing is not
worth it, especially since **the capability already exists**: `/profile` has
delete-account calling `DELETE /api/profile` (removes the member row, push
subscriptions, and the Supabase auth user). The native work is a small settings
screen calling the same logic - include it in v1 rather than debating it.

Plumbing note: that endpoint authenticates via session cookies. A native client
authenticates with a Bearer JWT, so v1 needs the handful of app-called API
routes (leader contacts, delete account) to also accept
`Authorization: Bearer` - a small change to the server client factory, and the
same plumbing the leader area needs anyway. A Supabase Edge Function is the
alternative, but keeping it in one codebase is the recommendation.

---

## 4. Beta App Review readiness

External TestFlight testing = Beta App Review on the first build (and after
significant changes). Lighter than full App Store review, but it checks the same
basics: it must not crash, login must be reviewable, privacy policy must exist,
metadata must be sane.

| Item | Status | Action needed |
|---|---|---|
| Privacy policy | **Exists and is good** - `radcliffe.run/privacy` with a sub-processor table (GDPR commitment per ARCHITECTURE.md) | Add app-specific rows before beta: push tokens as a data category; Expo (push relay) and Apple/APNs as processors. Add the app to the policy's scope wording |
| App Privacy "nutrition label" (App Store Connect questionnaire) | Not started | For the v1 cut: push token = device identifier (not linked to identity for anonymous users); sign-in means email/name declared as "linked to you"; leader access to contacts is server-held data viewed in-app, but declare honestly (contact info, health info categories, linked, not used for tracking). Location for the breadcrumb trail is processed on-device only and never transmitted, so it is NOT declared as collected - revisit if trail sharing ever ships. No tracking, no third-party ads - the label stays clean |
| Demo account for review | Not needed for the first rollout rings: internal TestFlight (Paul + first leaders) has NO Beta App Review | At the external stage: all member-facing content is browsable without sign-in, but the gated leader area means App Review notes + demo credentials. OTP-by-email is painful for reviewers, so plan a dedicated review member whose inbox Paul controls, or an env-gated fixed code for one review address. Work item at the external-TestFlight milestone, not before |
| In-app account deletion | Already built on web (`DELETE /api/profile`) | Native settings screen calling the same logic, in v1 (see section 3) |
| UGC / moderation | **None** - members cannot post content in the app (news is admin-published, no comments) | Nothing. Keep it that way in v1; adding any member-visible UGC drags in Guideline 1.2 (moderation, reporting, blocking) |
| Beta metadata | Not started | Beta app description, feedback email (hello@radcliffe.run forwards to the group Gmail - fine), marketing URL (radcliffe.run), support URL |
| App metadata (carries to any future App Store release) | Not started | Name (see below), subtitle, category (Sports or Health & Fitness), age rating questionnaire (4+; no health data collected), screenshots for 6.7" and 6.1" |
| Push notification entitlement | Standard | Declared via EAS config; no special review issue since push is opt-in and not marketing-only |

### The publisher-name decision (flag for Paul)

TestFlight and any eventual App Store listing show the **developer account name**.
Paul's account is individual, so it ships as **"Paul Cox"**, not "Run Together
Radcliffe". Options:

1. **Ship under "Paul Cox"** (zero cost, honest - it is a volunteer-built club
   app). Fine for TestFlight beta; slightly odd on a public App Store listing.
2. **Apple Developer organisation account** - requires a legal entity with a
   D-U-N-S number. RTR is (presumably) an unincorporated association, which
   generally cannot get one; this path realistically means incorporating or using
   a CIC/charity vehicle. £79/yr on top. Not worth it for a beta.
3. Publish under a Paul-owned limited company if one ever exists.

Recommendation: option 1 for TestFlight, revisit only if/when a public App Store
release is wanted. Related naming note: the England Athletics "RunTogether" brand
is in the club's name - if the App Store name is "Run Together Radcliffe", it may
be worth a courtesy check against the RunTogether programme's branding guidance;
"radcliffe.run" as the app name sidesteps it and matches the site identity.

---

## 5. Data / API readiness (the backend-first work)

Supabase is already the API - a native client talks PostgREST directly with the
anon key (public by design; it ships in the site's JS bundle today). That makes
RLS the entire security model for the app. The audit of production policies
(5 Jul 2026) found the read side ready and the write side in need of a cleanup
**that matters today, before any app exists**.

### Reads the app needs: already safe

| Data | Policy (production) | Verdict |
|---|---|---|
| `runs` | anon SELECT, unqualified | Ready. Includes `cancelled`, `on_tour`, `meeting_lat/lng`, `strava_url` - everything the schedule feed needs |
| `route_descriptions` | public SELECT | Ready |
| `site_settings` | anon SELECT | Ready (needed for C25K flags if ever surfaced; mildly over-shares email defaults - harmless, note only) |
| `posts` (news, v1.1) | anon SELECT where `status = 'published'` | Ready |
| Route catalogue | **Not in the DB** - `lib/routes.ts` is a static TS file; GPX + webps are static site files | Gap - see below |
| `members` self-row (v1 sign-in) | authenticated, `auth.email() = email` | Ready; correct pattern (members.id is NOT the auth UUID - AGENTS.md) |

**The routes-catalogue gap:** the app cannot import `lib/routes.ts`. Options:
(a) a public read-only endpoint on the site (`GET /api/routes`) returning the
merged catalogue (static file + DB overrides) - recommended, ~30 lines, cacheable,
and the site remains the single source of truth; (b) bundle a snapshot in the app
(goes stale); (c) migrate the catalogue into the DB (bigger job, real benefits,
not needed for this). GPX files and both webp themes are already served over HTTPS
from radcliffe.run and need nothing.

### Writes: one new path

Push token registration via `POST /api/push/register` (section 2). No PostgREST
write policies needed for v1. Sign-in reuses the existing self-row RLS; the
leader area and delete-account go through Bearer-authenticated API routes (next
subsection), not new policies.

### Leader emergency contacts from a native client

The web leader page reads all members server-side with `supabaseAdmin()`. Two
things must stay true natively: the app never holds the service-role key, and
leader access to the full register should NOT become an RLS policy on `members`
(a policy like "leaders may SELECT all rows" means one flipped `is_run_leader`
flag exposes every emergency contact and medical note to that member's JWT via
raw PostgREST - too blunt for the most sensitive table in the system).

The right shape: the app calls the existing Next.js server - a
`/api/leader/contacts` route accepting `Authorization: Bearer <access token>`.
The server validates the JWT, checks `is_run_leader` via the service role
(exactly what `app/api/leader/member/[id]/route.ts` and the leader pages do
today), and returns the contact set. Same trust model as the web, one new
auth-header path in the server client factory, zero new RLS.

On-device caching - the offline case is real (trail routes and the towpath have
poor signal, and an incident is precisely when the lookup must not depend on
connectivity): cache the last-fetched contact list in `expo-secure-store`
(encrypted at rest), refresh on every app foreground, wipe on sign-out and when
`is_run_leader` is revoked. Online-only is the more conservative option; the
cache is what actually helps at an incident. Paul's call - decision list.

### The security finding: over-broad `authenticated` grants (fix regardless of the app)

**RESOLVED Jul 2026 (verified on production 6 Jul 2026).** The 8 admin routes
now call `requireAdmin()` (commit 2883602) and the over-broad policies are
narrowed in `supabase-rls-baseline.sql` (commit a923d87), applied to dev and
production and covered by the `tests/access` harness. One deliberate leftover:
`site_settings` keeps an authenticated UPDATE grant that is inert (no
authenticated SELECT policy exists, so it is unusable via PostgREST) - the
harness documents and tests this. The finding below is retained as written,
for the record.

Production RLS currently gives ANY authenticated user - i.e. **any of the ~100
registered members who completes the OTP sign-in** - blanket access via PostgREST
with the public anon key:

| Table | Policy | Exposure |
|---|---|---|
| `runs` | ALL for authenticated, `qual: true` | Any member could UPDATE/DELETE the schedule |
| `posts` | ALL for authenticated | Any member could publish/edit news |
| `site_settings` | UPDATE for authenticated | Any member could change site config |
| `scheduled_emails` | ALL for authenticated | Any member could read/edit/cancel newsletters |
| `email_send_log` | ALL for authenticated | Any member could read recipient emails (personal data) |
| `email_snippets` | ALL for authenticated | Same class |
| `push_subscriptions` | ALL for authenticated (+ public INSERT/DELETE) | Any member could dump all push endpoints |
| `route_descriptions` | INSERT/UPDATE for authenticated | Any member could rewrite route descriptions |

These look like vestiges of an era before `supabaseAdmin()` - **every admin and
leader page now uses the service role**, which bypasses RLS entirely, so narrowing
these policies should break nothing. But AGENTS.md records that a past RLS
narrowing broke admin pages, so the fix must verify each policy is truly unused
(grep for browser-client table access; the browser client is only used in
join/login/nav/theme/leader-lookup components) and go through staging like
anything else.

The same gap exists at the API-route layer: **8 of the `/api/admin/*` routes check
only that a session exists, not that it is an admin** (`notify`, `posts`,
`posts/[id]`, `settings`, `snippets`, `snippets/[id]`, `upload`, `members/[id]`) -
the middleware admin gate matches `/admin/*` pages but not `/api/admin/*` paths.
The other admin routes already use `lib/admin.ts`'s `requireAdmin()`; these eight
need the same one-line fix. `members/[id]` (PATCH/DELETE any member) and `notify`
(broadcast push) are the worst of them.

**This is the single genuinely blocking backend work item, and it is worth doing
this month whether or not the app ever ships.** Today the risk is only masked by
the fact that no member knows the endpoints exist; the native app increases
exposure (more members holding fresh authenticated JWTs, more eyes on the API
surface) but does not create it.

### RLS work list for the app itself

1. Fix the 8 admin routes (`requireAdmin()`), narrow/drop the 8 over-broad
   policies after verification. **DONE Jul 2026** (commits 2883602 / a923d87,
   verified on production 6 Jul 2026).
2. Create `push_tokens` table + register/prune endpoints. (New, small.)
3. `GET /api/routes` catalogue endpoint. (New, small.)
4. Bearer-token support in the server auth path + `/api/leader/contacts` +
   Bearer variant of delete-account. (New, small - and it must land AFTER item 1,
   since Bearer support widens how authenticated requests reach the server.)
5. Nothing else - reads are ready as-is.

### Attendance recognition endpoint (backend 10 Jul 2026; display SHIPPED 11 Jul)

The awards/gamification display has its backend live already - and v1.1 is
PULLED FORWARD (Paul, 10 Jul 2026): the Nov-Dec slot was driven by the C25K
cohort, but the historic backfill landed early (~90% of attendance data is
in), so regulars get recognised ASAP. Sequencing:

1. **Badge/trophy design session first** - DONE 10 Jul: badge grammar +
   My Ladder screens designed in the Pencil file; decision records in
   `docs/RECOGNITION_DESIGN_BRIEF.md`.
2. **Display screen** - DONE 11 Jul 2026: built in native-apps (apps/rtr
   commit 905f058) and shipped by OTA to the production channel - My Ladder
   drill-in, Club tab Ladder Card, Milestone celebration (interim
   client-side once-only trigger; build decision record in
   `docs/RECOGNITION_DESIGN_BRIEF.md`). Straight off
   `GET /api/attendance/summary`, no new backend; seed presentation per the
   workshop principle - achieved is achieved, no retro fanfare.
3. **Celebration machinery - the OPEN step**: the awards cron job (dated
   crossings, notify-once, seed-era rungs written silently with
   `achieved_on` NULL; the `awards` table exists on production, nothing
   writes it yet), an /admin/recognition surface (recent crossings with the
   awards_public flag beside each - the toggle gates public naming in
   roundups/socials, not admin visibility), and the leader recognition
   loop. Once live, the app's interim local milestone trigger should switch
   to the server's notified_at state.

The app needs NO changes for attendance capture (volunteer credit is written
server-side by `POST /api/leader/checkin` when the checked-in member is a
leader). For the member-facing display, consume:

- `GET /api/attendance/summary` - cookie or `Authorization: Bearer` (same
  as every app route). Returns the CALLER's own ladders only:
  `{ run: { total, seed, recorded, rungs, nextRung, toNext },
     volunteer: { ...same shape }, awardsPublic: boolean }`.
  Rungs are 10/25/50/75/100 then every 25 (revised 12 Jul 2026; centuries
  stay the celebrated tier). The app is rung-agnostic - it renders whatever
  `rungs`/`nextRung` the API returns - so the list can change server-side
  without an app release. `seed` is pre-site history
  (undatable - present milestones crossed inside it as "already achieved"),
  `recorded` is counted nights since. 401 signed out; 404 if the account has
  no member row.
- `awardsPublic` mirrors `members.awards_public` (default false - private by
  default, opt-in public celebration). The toggle (designed 10 Jul at the
  foot of My Ladder) writes `PATCH /api/profile` with
  `{ "awards_public": true|false }` - supported since 11 Jul 2026, cookie or
  Bearer, same route the app's account screens already use.
- Counting rules, schema and the decision record live in
  `docs/ATTENDANCE_RECOGNITION_BRIEF.md` - the app renders shapes, it never
  recomputes counts.

### Runner home endpoint (backend 11 Jul 2026)

Built ahead of the app's home build, per `docs/RUNNER_HOME_BRIEF.md` (workshop
+ Pencil decision records). Backend-first: every surface is server-derived,
the app never re-derives.

- `GET /api/home` - cookie or Bearer, member-authed. 401 signed out, 404
  signed-in with no active member row (the app renders its signed-out /
  cold-start states off those). Returns:
  `{ firstName, isRunLeader, usualGroup, groupCounts, collectiveStat,
     developmentPreference }`.
  - `usualGroup` (`'8k' | '5k' | 'jeff' | null`) - the majority
    `attendance.group_key` over the member's live-era check-ins (a non-null
    `group_key` IS the live-era filter - photo-era backfill mostly lacks it).
    Null until 3+ such check-ins AND a strict majority; null means the app
    renders equal tiles (cold start and no-majority are the same render).
    Leader-inclusive by design. `groupCounts` carries the per-group counts
    used, so provenance is auditable and the app never re-derives.
  - `collectiveStat` (`{ count, runDate } | null`) - distinct members
    checked in on the most recent qualifying run date (`run_type IN
    ('regular','c25k')`, not cancelled - the AGENTS.md counting invariant).
    A cancelled week keeps showing the previous run, never a zero state.
    Members-only - never served anon.
  - `developmentPreference` mirrors `members.development_preference`
    (`'get_fitter' | 'run_further' | 'first_race' | 'enjoy_thursdays' |
    null`), written via `PATCH /api/profile` (whitelisted 11 Jul 2026,
    same optimistic-update contract as `awards_public`). Skippable,
    editable forever, app-only for now (no email use).
  - Does NOT duplicate the milestone summary - the app already consumes
    `GET /api/attendance/summary` for the header badge + popover.
  - Logic lives in `lib/home.ts` (`usualGroupFromCounts`,
    `usualGroupForMember`, `collectiveStat`), unit-tested in
    `tests/home.test.ts`.
- `GET /api/walks` - anon read (walks are public site content, same trust
  level as `GET /api/routes`). Tiny mirror of `lib/walks.ts` for the app's
  solo-card Walks button; heritage `stages` (draft, unverified copy) are
  deliberately left out of the payload.
- Not yet built: invitation eligibility (waits on live `group_key` volume +
  thresholds Paul calibrates) and route familiarity (deferred to autumn) -
  both light up in the app without a layout change when their data exists.

---

## 6. Design brief for the Pencil session

> **Superseded in part (6 Jul 2026):** the standalone, self-contained brief for
> the Pencil session is `docs/PENCIL_DESIGN_BRIEF.md`, which folds in the
> workshop decisions (section 8): registration + check-in screens join the
> set, MapLibre is the decided map renderer, and the tab structure question is
> now "fourth leader tab vs Club depth". The brand-source and
> what-ports-from-native-apps material below remains accurate.

### Sources - RTR brand, not Calm Coach

The design language is **RTR's existing identity**, not the native-apps "Calm
Coach, neutral ink" system. Sources, in order:

1. The live site's CSS variables - the definitive token set, with dark AND light
   values already worked out (dark `--bg #0a0a0a` / card `#111` / border `#1e1e1e`
   / orange `#f5a623`; light equivalents; full table in `docs/ARCHITECTURE.md` and
   the ThemeProvider). Dark is the brand-default.
2. The rtr-branding assets (`/Users/paulcox/Documents/RTR branding` + the
   rtr-branding skill): logo, fonts, the carousel/overlay visual language.
3. Font: **Inter** (300-800, already licensed and in use), not Manrope. Same
   custom-font gotcha as the other apps: per-weight family names, `fontWeight`
   is ignored.

Established visual vocabulary to carry in: terrain colour-coding (road blue
`#5b9bd5` on `#0d1a2a`, trail green `#4caf76` on `#0d2a0d`), C25K purple, the
on-tour amber badge, orange as THE accent, card-on-dark with hairline borders,
the route map webps (dark + light variants exist for every route and can be
fetched straight from the site).

### What ports from native-apps (architecture, not paint)

- **Tab grammar + drill-ins**: few tabs, stack screens for depth, reading screens
  without the tab bar. Straight port.
- **`useCached` fail-soft**: cache-first, background refresh, stale-data banner.
  The failure message changes meaning ("offline - showing last week's schedule"
  instead of "mini unreachable") but the mechanic is identical and the schedule
  is exactly the kind of data that should never show a spinner.
- **expo-router, SDK 57, EAS profiles, browser-preview verification loop** - all
  proven. Verification is actually *easier* here: Supabase accepts browser CORS
  calls, so the preview can read the production anon endpoints live rather than
  seeding a localStorage cache from a snapshot.
- **packages/ui: partial.** The primitives (Card, Pill, DrillCard shapes, the
  theme mechanic) are reusable; the *tokens are not* - Calm Coach's warm neutrals
  and single-state-colour rule do not describe RTR. Decision needed on mechanics
  (see section 7): either `packages/ui` learns to take an injected token set, or
  `apps/rtr` gets its own small `ui/` and copies the component patterns. Do NOT
  blend the palettes.

### What is decided fresh in Pencil

- The RTR token set as Pencil variables (from the site's CSS vars, both themes).
- Tab bar style (the finance floating pill vs something RTR-flavoured).
- Card composition for a run (the site's homepage run card is the reference:
  route map image, terrain badge, distance chips, meeting point, on-tour banner,
  cancelled state).
- The notification primer screen (the one screen with persuasion in it).
- Iconography and the app icon (RTR logo treatment on dark; light/dark/tinted
  variants per the process already walked for Abingdon/Finance).

### Proposed tab structure (to react to, not decided)

**Three tabs: Runs · Routes · Club**

- **Runs** - next run hero card (the Thursday answer: what, where, when, on-tour
  banner, cancelled state) + upcoming feed below (today-anchored, like the
  Abingdon schedule). Drill-in: run detail - full map with GPX polyline, live
  position dot, the "track this run" breadcrumb control (section 1), keep-awake
  toggle, meeting point with Apple Maps directions (exact lat/lng where
  resolved), leader, description, link to Strava route.
- **Routes** - the library: searchable/filterable card list using the existing
  webp map images. Drill-in: route detail - interactive map (GPX polyline, live
  position, same tracking control), distance/terrain/elevation, description.
- **Club** - v1: notification preferences (the two toggles), sign-in (email ->
  OTP code), about/contact links, "Join RTR" and "News" links out to the site,
  privacy policy link, account deletion (when signed in), version. When the
  signed-in member has `is_run_leader`, a **Leaders** section appears with the
  emergency-contacts drill-in: search-as-you-type, member card (emergency
  contact with one-tap call, medical notes, NO PHOTOS badge - mirroring the web
  `LeaderLookup`). The tab bar itself never changes with role; leader access is
  depth within Club. v1.1: profile editing + C25K awareness grow here; news
  could become in-app content.

Alternative considered: two tabs + a settings modal (closer to a utility). The
third tab earns its place as the home for sign-in and news later without a
restructure - but this is exactly the kind of call the Pencil session is for.
**Workshop update (6 Jul 2026):** with check-in now in v1, the Pencil session
explores a fourth leader tab against this shape - see section 8 item 22 and
`docs/PENCIL_DESIGN_BRIEF.md`.

Map rendering choice for detail screens: **DECIDED 6 Jul 2026 - MapLibre**
(section 8 item 16), for tile-style continuity with the site including the
historic-map layer. The original recommendation (react-native-maps: simpler,
free) was declined in favour of one map language across web and app. Build
task: a MapTiler key restricted by app bundle ID - the site's
domain-restricted key cannot be used from a mobile app.

---

## 7. Repo location + build sequence

### Where the code lives

**Recommendation: `apps/rtr` in the native-apps monorepo.**

For the monorepo:

- Inherits everything proven: EAS config shape, expo-router scaffolding, the
  browser-preview verification loop, `useCached`, the delegation agents
  (`screen-builder` / `mechanic`), typecheck/test wiring. The roadmap's own
  argument - "the second app inherits ~all plumbing" - held true for Finance and
  applies triple here.
- One `npm install`, one toolchain to keep current across three apps.
- `packages/api-client` is irrelevant to RTR (Supabase client instead), but that
  is omission, not friction.

For a separate repo (the public-project argument):

- The site repo is public and club-owned in spirit; native-apps is Paul's
  personal monorepo mixing in his private Finance/health apps. If the club ever
  wanted the app code public, or another volunteer wanted to contribute, it
  would need extracting.
- Separate repo keeps RTR's staging-first discipline cleanly distinct from the
  monorepo's propose-commit convention.

The extraction cost later is low (Expo apps are self-contained under `apps/`),
and no second contributor exists today. Start in the monorepo; extract if the
club-ownership question ever becomes real. The tokens question folds in here:
recommendation is `apps/rtr/src/ui/` with its own `tokens.ts` (RTR values, same
shape as `packages/ui`'s) and copied component patterns - parametrising
`packages/ui` for multiple brands is speculative generality until a third
brand appears.

One convention note: RTR *site* changes arising from this project (RLS fixes,
push endpoints, `/api/routes`) follow THIS repo's rules - staging-first, real
branches from fresh origin/main, schema-to-production-before-code. App-side work
follows the monorepo's conventions. Neither leaks into the other.

### Build sequence (gated)

**Pacing amended 6 Jul 2026:** the milestone contents below remain the work
breakdown, but section 9 sets the calendar and widens the cut - registration
and attendance check-in join the build (alongside the M2/M3-era screens),
Gate 0 must clear early in July, M5/M6 compress into August with the Google
Play closed track as a parallel second lane, and Android ships with iOS
rather than waiting in M7.

**Gate 0: the Abingdon TestFlight pipeline is proven end-to-end** (Apple ID
review -> dev build -> device -> TestFlight). RTR starts nothing app-side until a
build of an existing app has been installed and run from TestFlight, because
that pipeline is the riskiest unproven step and Abingdon is the cheap place to
debug it.

Then, in order (each milestone = a verified, committed state per the established
workflow):

- **M0 - site-side hardening + API prep** (this repo, web-only, ships value even
  if the app never happens): `requireAdmin()` on the 8 routes; narrow the
  over-broad RLS policies (with the verification pass section 5 describes);
  `push_tokens` table + `POST /api/push/register`; `GET /api/routes`;
  Bearer-token support + `/api/leader/contacts` (after the hardening, per
  section 5). Schema to production Supabase first, then code via staging.
  Independent of Gate 0. **Hardening half DONE Jul 2026** - the
  `requireAdmin()` fixes and RLS narrowing are live on production (section 5);
  the API-prep half (`push_tokens`, `GET /api/routes`, Bearer support +
  `/api/leader/contacts`) remains.
- **M1 - Pencil design session**: RTR tokens as variables, then renders for the
  screens (Runs feed, run detail, Routes library, route detail, Club, sign-in,
  leader lookup + member card, notification primer), light + dark. Output:
  `design/` renders + tokens extracted to `apps/rtr/src/ui/tokens.ts`, per the
  Abingdon process. **DONE 6 Jul 2026** - design file is the Pencil document at
  `/Users/paulcox/Documents/RTR app`: all 12 screens (incl. registration,
  check-in, both registration-finish variants) in both themes, tokens on a
  dark/light mode axis, components, PWA-mark icon variants, and build-note
  annotations. Tokens extraction to `apps/rtr/src/ui/tokens.ts` happens at
  M2 scaffold time. In-session decisions recorded in section 8 (items 16 and
  22) and `docs/PENCIL_DESIGN_BRIEF.md`.
- **M2 - scaffold + read-only screens**: `apps/rtr` (Expo SDK 57, expo-router),
  Runs + Routes tabs against production anon reads, `useCached` wired,
  browser-preview verified against live data, typecheck/tests green. Delegation
  per the established tiers (screens to `screen-builder` once tokens and data
  shapes are pinned). **DONE 6 Jul 2026** - and the build ran well past M2:
  all 12 designed screens exist (incl. registration + both finish variants,
  check-in with offline queue, contacts with encrypted cache, sign-in,
  primer, settings + account deletion), verified in the browser preview at
  375x812 against LIVE data both themes (production anon reads; leader flows
  against the dev project with a minted test-leader session - a real
  check-in row landed in dev attendance). Site-side API prep (the M0
  remainder) landed the same day in this repo: attendance +
  push_tokens/push_send_log migrations applied to dev AND production,
  Bearer auth (lib/apiAuth.ts), /api/routes, /api/leader/contacts,
  /api/leader/register, /api/leader/checkin, /api/push/register,
  lib/expoPush.ts, /api/cron/send-push (claim-locked), /admin/notify ->
  web + Expo, CORS middleware for app-facing paths - staging push pending
  approval. Still device-gated: real push delivery (+ Firebase/FCM
  credential in EAS), MapLibre live maps + MapTiler bundle-id key,
  breadcrumb tracking (internal-TestFlight ring per decision 17), OTP
  auto-fill, expo-calendar. The full backend follow-up ledger (cancellation
  push from the runs UI, cohort-leader welcome fields - the app's Session
  Zero leader message is placeholder copy until then - cohorts table, solo
  self-report, session-1 nudge, awards ledger + backfill) lives in
  ~/Documents/rtr-site/TASKS.md under "Backend follow-ups from the app
  build".
- **M3 - sign-in + leader mode**: OTP flow with secure-store session, Club tab,
  leader contacts drill-in against `/api/leader/contacts`, the caching decision
  applied, account-deletion screen. Verified with Paul's own leader account.
  This is the milestone that makes the app worth having on Paul's phone.
- **M4 - push end-to-end**: permission primer + registration in-app;
  `lib/push.ts` + `/api/cron/send-push` + admin `/admin/notify` extension on the
  site (staging-first); cron-job.org Thursday trigger; verified with a real
  push to Paul's phone via a dev build.
- **M5 - internal TestFlight**: Paul first, then 2-3 leaders added as internal
  testers (App Store Connect team members - clunky but fine at this count, and
  it means NO Beta App Review while the leader mode is exercised on real
  Thursdays). App icon, splash, empty/error states polished; weekly announcement
  copy tuned. **The breadcrumb tracking feature is built and battle-tested
  inside this ring** - background location is exactly the thing to iterate
  (battery, task lifecycle, auto-stop) with zero review exposure before Apple
  first sees the app. This ring matches Paul's stated rollout exactly.
- **M6 - external TestFlight (Beta App Review)**: privacy label, beta metadata,
  review notes + demo credentials for the gated leader area, the
  background-location purpose strings + a note on the local-only design, policy
  updates from section 4, then invite the wider membership. First contact with
  Apple review happens here, with everything member-facing browsable without
  sign-in.
- **M7 (explicitly unscoped)**: public App Store release, v1.1 features
  (profile, news in-app, C25K awareness), Android. Each is its own decision
  later.

---

## 8. Settled decisions (workshop with Paul, 6 Jul 2026)

Every open question from the 5 Jul draft and from
`docs/C25K_ENGAGEMENT_RESEARCH.md` was decided at the 6 Jul decision workshop.
Nothing here is open: the Pencil session (`docs/PENCIL_DESIGN_BRIEF.md`) and
the build prompts inherit zero open questions. Where Paul's call went against
the doc's recommendation it is flagged.

**Scope and platform**

1. **v1 cut - confirmed as amended**: schedule + routes + push (no login wall)
   + registration + attendance check-in + leader area (emergency contacts,
   breadcrumb tracking). Awards/gamification deferred to v1.1 (Nov-Dec).
   *Rationale: measure before mechanising - the attendance data should exist
   before the first badge does.*
2. **Android** - first-class alongside iOS (settled earlier on 6 Jul,
   section 9). *Rationale: the club cannot depend on a check-in system that
   excludes Android leaders and members.*
3. **Android test device** - buy a cheap handset (~£80-120) for development;
   leaders' phones join at the Play closed-test stage anyway. *Rationale: push
   and background location need a real device, and the August window is too
   tight to remote-debug someone else's phone.*

**Attendance and awards** (mechanics per `docs/C25K_ENGAGEMENT_RESEARCH.md`)

4. **Capture** - leader one-tap register is the system of record; any
   `is_run_leader` member can record; member self-report only for solo weekend
   C25K sessions. *Rationale: the only zero-member-friction option, and
   leaders are the app's first users.*
5. **Historic backfill - YES** (against the first-captured-session
   recommendation): Paul holds real attendance records for regulars from
   before radcliffe.run launched, so lifetime counts are seeded from that
   data; only the last couple of months (unrecorded) stay uncounted. Import
   path (historical run + attendance rows vs a per-member seed offset) is a
   build-time detail. *Rationale: it is actual records, not memory - the
   guesswork objection does not apply, and long-standing regulars start with
   their real history (some will land on a Ladder B milestone at launch - a
   feature, not a bug).*
6. **Award structure - confirmed**: C25K programme ladder First Step /
   Off the Couch / 4 / 8 / 12 / 16 / Graduate (event-based); per-day
   "Tuesday Regular" / "Thursday Regular" badges (~7 of 10, tuned on real
   data); lifetime Ladder B 10/25/50/75/100 then every 25 (rung list revised
   12 Jul 2026 - see docs/ATTENDANCE_RECOGNITION_BRIEF.md) **club-wide** - existing regulars
   earn it too, seeded by the backfill. Attendance-only, never performance.
   Digital rungs, physical at Graduate (certificate + consent-aware photo).
   *Rationale: attendance-contingent recognition is the strongest finding in
   the research; Ladder B club-wide is the C25K-to-club conversion bridge.*
7. **Forgiveness - no streaks, ever**: cumulative counts that only go up; no
   decay, no expiry; missing sessions does nothing except not increment.
   *Rationale: broken streaks drive quit-entirely churn, and the programme
   itself prescribes repeating weeks.*
8. **Celebration - private by default**, per-member opt-in public flag (the
   `photo_consent` mould); cohort collective totals shown; milestones fed to
   leaders so a human says it out loud at the session. No leaderboards, no
   member-vs-member comparison. *Rationale: embarrassment is a documented
   dropout emotion; verbal unexpected recognition enhances intrinsic
   motivation.*
9. **"We missed you" nudges** - wait for the C25K cohort; the autumn Thursday
   pilot records only. *Rationale: regulars missing a Thursday is life, not
   dropout, and unwanted nudges are the documented opt-out driver.*

**Registration**

10. **Form stays as-is** - all current fields, nothing deferred. *Rationale:
    every required field is a justified safety requirement; the form is not
    the drop-off problem, the silence after it is.*
11. **Session-zero package - confirmed in full**: First Step award at submit,
    named-leader welcome (written once per cohort by that leader), concrete
    first-session details + add-to-calendar, night-before session-1 nudge,
    registration-to-session-1 conversion instrumented. *Rationale: endowed
    progress, relatedness, and implementation intentions are the evidence's
    strongest cards.*

**Push**

12. **Event set** - weekly Thursday announcement + cancellation + on-tour
    change; two per-device toggles (weekly / alerts). Announcement fires
    **Thursday ~4pm via cron-job.org** (claim-locked, idempotent).
    *Rationale: few, event-anchored, high-value pushes; 4pm lands when people
    decide about tonight.*
13. **Senders** - admins only in v1; the `/leader/notify` cancellation page is
    deferred until a real gap shows. *Rationale: the weekly send is automatic,
    manual sends are exceptions, and July is tight.*
14. **Expo Push over raw APNs** - the mild vendor dependency is accepted.
    *Rationale: one fetch call, EAS manages certs, one API covers iOS and
    Android; raw APNs buys nothing at ~100 members.*

**Technical**

15. **Leader contacts cached on-device** - encrypted secure-store, refreshed
    each foreground, wiped on sign-out and on `is_run_leader` revocation.
    *Rationale: the incident case is exactly when connectivity fails.*
16. **Map rendering - MapLibre** (against the react-native-maps
    recommendation): tile-style continuity with the site, including the
    historic-map layer. **New build task: a MapTiler API key restricted by
    app bundle ID** - the site's domain-restricted key cannot be used from a
    mobile app. *Rationale: one map language across web and app outweighs the
    extra setup.* **Amended at the Pencil session: map imagery is LIGHT in
    both themes** - the site's dark tint is too dark at app sizes, so card
    images use only the light webp set and the live map is a single light
    tile style. App-only; the site keeps its dark cards.
17. **Breadcrumb tracking - confirmed as designed**: local-only,
    session-scoped, While-Using permission + visible indicator, trail
    discarded after the run, built inside the internal-TestFlight ring.
    Shared live location stays out. *Rationale: all the navigation value,
    none of the consent or App Privacy burden.*

**Shipping**

18. **Publisher** - Paul Cox personal accounts on both stores. *Rationale: an
    organisation account needs a legal entity RTR does not have; honest for a
    volunteer-built club app.*
19. **App display name** - "radcliffe.run". *Rationale: matches the site
    identity and sidesteps the England Athletics RunTogether branding
    question.*
20. **Repo** - `apps/rtr` in the native-apps monorepo, with its own
    `src/ui/tokens.ts` (RTR values, no palette blending). Site-side work
    stays in THIS repo under its staging-first rules. *Rationale: inherits
    all proven plumbing; extraction later is cheap if club ownership ever
    becomes real.*
21. **M0 security hardening** - DONE Jul 2026, ahead of any app work,
    verified on production (section 5).

**Design and v1.1**

22. **Tab structure - DECIDED at the Pencil session (6 Jul 2026): the fourth
    leader tab ships.** Both shapes were designed and compared on the
    Thursday-night flow; leaders get Runs / Routes / Check-in / Club (the
    Check-in tab exists only for `is_run_leader` members), everyone else sees
    the role-stable three tabs. *Rationale: check-in is a leader's weekly core
    task - one tap beats a two-level drill-in every Thursday, and non-leaders
    never see the difference.*
23. **v1.1 order after gamification** - news/roundups in-app first, then
    profile editing. *Rationale: anon-readable content that gives members a
    weekly reason to open the app; profile edits are rare events served fine
    by the web.*
24. **Cohort history modelling** - confirmed as a build detail needed before
    January: `members.cohort` is single-valued, so multi-cohort award history
    and graduate identity need a `cohorts` table + join.

---

## 9. Timeline (agreed 6 Jul 2026)

Fixed points: check-in must be live for regular club runs **before 19 Sep
2026**; October 2026 is written off (Abingdon Marathon); the **January 2027
C25K cohort** launches on a system already proven over the autumn. Everything
else backs out from those three dates.

| When | Work |
|---|---|
| **Jul 2026** | Decision workshop (held 6 Jul). Pencil design session (held 6 Jul - M1 done, section 7). Build starts. v1 must include **registration + attendance check-in**; normal-runner check-in launches first so C25K inherits a proven mechanic. Gate 0 (TestFlight pipeline proven via Abingdon) clears early in the month |
| **Aug 2026** | Compliance: privacy-policy updates (section 4), in-app account deletion, Google Play Data safety form. Distribution: TestFlight **Beta App Review** (external testing) and the **Google Play closed track**. A personal Play account needs 12 testers over 14 continuous days before production access - the club beta satisfies this on its own. Tester rings: leaders first, then club runners |
| **Early Sep 2026** | **Check-in live for regular club runs** - hard deadline 19 Sep |
| **Oct 2026** | No planned work (Abingdon Marathon) |
| **Nov-Dec 2026** | Gamification v1.1 (ladders/badges per the workshop decisions in `docs/C25K_ENGAGEMENT_RESEARCH.md`), informed by the real autumn attendance data - "measure before mechanising" holds |
| **Jan 2027** | C25K cohort launches on the proven system |

How this maps onto section 7's milestones: M0-M4 and the internal-TestFlight
ring all land inside July's build window (with registration and check-in
joining the M2/M3-era screens); M5 and M6 compress into August, with Google
Play's closed track as a parallel second lane; M7's list is partly scoped
now - gamification v1.1 is Nov-Dec, and Android is not deferred at all.

### Android is first-class throughout

The original iOS-first posture is dropped: leaders and members on Android
cannot be excluded from a check-in system the club depends on.

- **EAS builds both platforms** from the same codebase and config - the
  marginal cost is setup, not a second app.
- **FCM/Firebase setup is a named build task** (July): Expo Push delivers to
  Android via FCM, which needs a Firebase project and its service credential
  wired into EAS. It has its own lead time and failure modes; treat it as a
  work item, not a checkbox.
- **expo-blur needs an Android fallback in the design**: blur support on
  Android is partial, so every blur treatment in the Pencil renders specifies
  a solid/translucent equivalent up front rather than discovering the gap on
  a device in August.
- **A real-device Android test path is needed** - push delivery and background
  location do not exercise properly in an emulator. Either a leader's own
  phone enrolled via the Play internal track, or a cheap handset.

### Immediate action

**Register the Google Play developer account now** - $25 one-off, but identity
verification has a lead time of days to weeks, and the 12-tester/14-day
closed-test clock cannot start until the account exists. It is the longest
external dependency in the August plan.

**DONE 6 Jul 2026** - account registered the day the timeline was agreed;
identity verification in progress. Once verified, nothing external blocks the
August closed track.
