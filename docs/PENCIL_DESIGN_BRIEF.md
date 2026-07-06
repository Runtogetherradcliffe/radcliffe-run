# Pencil design brief - radcliffe.run native app (iOS + Android)

Status: brief for the M1 Pencil design session (written 6 Jul 2026, immediately
after the decision workshop). Every input here is DECIDED - the session should
contain zero open product questions. The one deliberate design exploration is
the tab structure (below). Companion docs: `docs/NATIVE_APP_SCOPE.md`
(section 8 = the settled decisions; section 9 = the timeline) and
`docs/C25K_ENGAGEMENT_RESEARCH.md` (award mechanics and their evidence).

App display name: **radcliffe.run**. Publisher: Paul Cox (personal accounts,
both stores). Repo target: `apps/rtr` in `/Users/paulcox/native-apps`.

---

## 1. What the app is (one paragraph)

The member-facing home for Run Together Radcliffe: this week's runs with push
on the lock screen, the route library in your pocket, registration (the
January 2027 C25K cohort signs up here), and - for run leaders - attendance
check-in and emergency contact lookup. Check-in launches for normal club runs
first (live before 19 Sep 2026); gamification surfaces arrive v1.1 (Nov-Dec).
Android is first-class alongside iOS.

## 2. Decided mechanics the screens must express

- **Check-in (leader)**: one-tap register against the roster, live counter,
  group selection with wrong-group correction, "not on this list?" walk-up
  handling, check-in-another-runner. Re-taps are idempotent. **No booking
  anywhere** - check-in is retrospective recording, not access control.
  Starting wireframe: `docs/mockups/rtr-checkin-mockup.html` (May 2026; its
  booking half is dropped). Must work offline and sync later (Aldi car park
  signal).
- **Registration**: same multi-step form as web `/join` (all fields kept -
  about you, emergency contact, health declaration + consents), submitting to
  the same `/api/join` backend. **The finish screen branches on cohort**
  (raised by Paul at the session): C25K joiners get the **session zero**
  screen - "that was session zero - you have already started" (endowed
  progress bar), the First Step award, a welcome from the named cohort
  leader, the concrete first session with add-to-calendar; everyone else gets
  the **regular-member welcome** - same psychology (concrete first Thursday
  run, add-to-calendar, group explainer, "nobody left behind") with no
  programme furniture and no award, since Ladder B starts at the first
  attended run. Both variants are designed in the .pen file.
- **Awards (v1.1 surfaces, design space reserved now)**: cumulative counts
  only - no streaks, no decay. C25K ladder: First Step / Off the Couch /
  4 / 8 / 12 / 16 / Graduate. Per-day Regular badges. Lifetime ladder
  10/25/50/100, club-wide (existing regulars included, counts seeded from
  historic records). Private by default with an opt-in celebration flag;
  cohort collective totals are the only shared number; no leaderboards, no
  member-vs-member comparison, ever.
- **Push**: primer screen before the iOS system prompt ("get a heads-up about
  Thursday's run and any cancellations") - the one screen with persuasion in
  it. Two preference toggles: weekly announcement / alerts.
- **Leader contacts**: search-as-you-type, member card with one-tap call of
  the emergency number, medical notes, NO PHOTOS badge (mirrors web
  `LeaderLookup`). Works offline (encrypted on-device cache).
- **Breadcrumb tracking**: "track this run" control on run/route detail maps -
  planned GPX line, path actually run, current position; keep-awake toggle;
  local-only, discarded after the run.
- **Sign-in**: email then 8-digit OTP code (auto-fill from Mail), living
  quietly in Club - a regular member never sees a login wall. Account
  deletion screen (calls the existing web logic) under settings.

## 3. Brand sources (RTR identity, not Calm Coach)

1. **The live site's CSS variables** - the definitive token set, dark AND
   light (dark is brand-default): bg `#0a0a0a`, card `#111`, border `#1e1e1e`,
   orange accent `#f5a623`; full table in `docs/ARCHITECTURE.md` and
   `components/ThemeProvider.tsx`. Extract to Pencil variables, both themes.
2. **rtr-branding assets** (`/Users/paulcox/Documents/RTR branding` + the
   rtr-branding skill): logo, fonts, carousel/overlay visual language.
3. **Font: Inter** (300-800, licensed, in use). Native gotcha: per-weight
   family names; `fontWeight` is ignored.
4. Established vocabulary: terrain colour-coding (road blue `#5b9bd5` on
   `#0d1a2a`, trail green `#4caf76` on `#0d2a0d`), C25K purple, on-tour amber
   badge, orange as THE accent, card-on-dark with hairline borders, the route
   map webps (dark + light variants exist for every route, fetched from the
   site).

Output convention: tokens land in `apps/rtr/src/ui/tokens.ts` (same shape as
`packages/ui`'s, RTR values - do NOT blend the Calm Coach palette); renders in
`design/` per the Abingdon process.

## 4. Tab structure - RESOLVED at the session (6 Jul 2026)

Both shapes were designed in the .pen file and compared on the Thursday-night
flow. **Decision: the fourth leader tab ships.** Leaders see
**Runs / Routes / Check-in / Club** (the Check-in tab renders only for
`is_run_leader` members); everyone else sees the role-stable
**Runs / Routes / Club**. Rationale: check-in is a leader's weekly core task -
one tap beats a two-level drill-in every Thursday, and non-leaders never see
the difference. The 3-tab Club screen (leader tools as depth) remains in the
file for reference; emergency contacts stay reachable from Club as well as
from the leader flow.

## 5. Screens to design (light + dark, iOS + Android)

1. Runs feed (next-run hero: what/where/when, on-tour banner, cancelled state;
   today-anchored upcoming list)
2. Run detail (MapLibre map with GPX polyline + position dot + track control,
   meeting point with directions, leader, description, Strava link)
3. Routes library (searchable/filterable cards using the existing webps)
4. Route detail (interactive map, distance/terrain/elevation, description)
5. Club tab (sign-in entry, notification prefs, links, version)
6. Sign-in (email -> OTP code)
7. Leader: check-in register (roster checklist, counter, groups, walk-up)
8. Leader: contacts lookup + member card (one-tap call, medical, NO PHOTOS)
9. Registration flow (multi-step) + finish screen in both variants
   (C25K session zero / regular-member welcome, branched on cohort)
10. Notification primer
11. Settings / account deletion
12. App icon: the established PWA mark - white R + orange slash on dark
    (`public/icon-512.png`), NOT a new lettermark, since the app name is
    radcliffe.run and PWA users already know this tile. Dark/light/tinted
    variants designed. Build note: the PWA png has baked rounded corners;
    EAS/App Store needs a square 1024 source with no baked corners or alpha -
    regenerate from the master artwork

## 6. Platform notes

- **Maps: MapLibre** (decided) - the site's tile styles for visual
  continuity, including the historic-map layer. Build task flagged: a
  MapTiler key restricted by app bundle ID (the site's domain-restricted key
  cannot be used from a mobile app).
- **expo-blur has partial Android support**: every blur treatment in the
  renders must specify a solid/translucent Android equivalent up front - do
  not discover the gap on a device in August.
- Tab grammar, drill-ins, reading screens without the tab bar, `useCached`
  fail-soft ("offline - showing last week's schedule" banner): all port from
  the native-apps monorepo patterns.
