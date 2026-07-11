# Recognition design language - session brief

**What this is.** A self-contained prompt for the Pencil design session that
creates RTR's badge/recognition design language, ahead of the app's "my
ladder" screen design. Written 10 Jul 2026, the day the recognition backend
shipped (migration + seeds live on production; decision record in
`docs/ATTENDANCE_RECOGNITION_BRIEF.md`). Paste the block below into a
native-apps session.

**Why a separate session.** The ladder is open-ended (10/25/50/100 then
every 100th), so this is a visual GRAMMAR that must generate 200/300/500
without bespoke artwork, not a set of icons. The badges will also outlive
the app screen: weekly roundup posts, carousel graphics, milestone emails,
printed C25K graduation certificates. Design them as standalone tokens with
rules and every future surface inherits them.

---

```
Design RTR's recognition design language - the badge system for the
attendance ladders - in the existing Pencil file, ahead of the app's
recognition screen design (which is the NEXT session, not this one).

WHERE
The Pencil file at ~/Documents/"RTR app" (the M1 design file: 12 screens in
both themes, RTR design tokens, PWA-mark icon). Work inside it so the
badges inherit the tokens and can be size-tested against real screens.
Start with get_editor_state (include_schema) and get_guidelines.

READ FIRST
- radcliffe-run repo: docs/NATIVE_APP_SCOPE.md section 5 ("Attendance
  recognition endpoint") - the API contract and the pulled-forward v1.1
  sequencing this session is step 1 of.
- radcliffe-run repo: docs/ATTENDANCE_RECOGNITION_BRIEF.md decision record
  - how the counts are built and every decision already made.
- docs/PENCIL_DESIGN_BRIEF.md for the M1 file's conventions.

WHAT TO DESIGN (in order)
1. The badge grammar: a generative rule that renders ANY rung - 10, 25, 50,
   100, then every 100th forever - without new artwork per rung. Think
   colour/material tiers, numeral treatment on a common token, or an
   evolving shape. It must be obvious that 250 outranks 100 at a glance.
2. Two ladders, one family: RUN and VOLUNTEER badges. Decide family
   resemblance vs deliberate differentiation (parkrun uses a v-prefix; RTR
   can do better). A member sees both side by side.
3. States, all four: achieved (normal), achieved-inside-the-seed (quieter -
   pre-site history is honoured but never celebrated as news), locked/future
   (visible, aspirational), and next-up (carries the progress-to-next
   number, e.g. "3 to go").
4. Sizes: thumbnail row (~40px, several in a line), card (~80px), and
   full-bleed celebration. The grammar must survive all three.
5. Both themes, RTR tokens only - no new hardcoded colours. The badges will
   also be exported for site/email/print use, so keep shapes self-contained
   (no reliance on a particular background).

COPY DECISIONS TO SETTLE WITH PAUL IN-SESSION
- Rung names or bare numbers? (The C25K programme ladder has named rungs -
  First Step, Off the Couch; the lifetime ladder was adopted as numbers.)
- What the two ladders are CALLED in-app (runs / volunteering / leading?).
- The one-line celebration copy shape for a future crossing.

PRINCIPLES ALREADY DECIDED - DO NOT RELITIGATE
- Attendance-only, never performance. No streaks, no decay, counts only go up.
- Private by default; awards_public is an opt-in consent flag members toggle.
- No retro fanfare: milestones crossed inside the seed present as "already
  achieved", quietly. The first NEW crossing is the first celebration.
- The member experience: open the app, see what you have achieved, see how
  far to the next rung. That is the screen this language must serve.

REAL DATA FOR MOCKS (live production shapes from GET /api/attendance/summary:
{ run: { total, seed, recorded, rungs, nextRung, toNext },
  volunteer: { same }, awardsPublic })
- Paul: run 160 / volunteer 160 (rungs 10,25,50,100 both; next 200)
- Kate Myers: 151 / 119. Neil: 160 / 25. Ros: 54 / 11.
- A mid-range regular: ~40 / 0. A newcomer: 3 / 0 (nextRung 10, toNext 7).
- Design must be graceful at 0 / 0 (brand-new member, nothing unlocked).

OUTPUTS
- Badge components + the grammar rules as reusable Pencil components/tokens.
- One rough "my ladder" screen mock purely to size-test the badges in
  context (NOT the final screen design).
- A short written record of the copy decisions taken with Paul, appended to
  this brief in the radcliffe-run repo.

Screen design proper, then the app build, follow in later sessions once
Paul signs off the language.
```

---

## Decision record (design session, 10 Jul 2026)

Session held in the Pencil file at `~/Documents/RTR app`. The badge language
is designed, both themes, and signed off by Paul in-session.

### The grammar (generative - no artwork per rung)

One circular token: ladder glyph on top, the number as hero (Inter
ExtraBold), self-contained fill (works on any background/export surface).

- **Below 100** (the approach rungs, always exactly 10/25/50): quiet coin -
  `card` fill, 2 px `orange` ring, `text-hi` numeral, `orange` glyph.
- **Every 100th, forever**: the coin fills solid `orange` - century club -
  with `#0f0f0f` numeral/glyph (the Primary Button ink-on-accent precedent,
  theme-independent) and **one pip per hundred** under the number
  (200 = ••, 300 = •••). The numeral always carries the rank;
  solid-vs-outline makes century club scannable even at 40 px.
- **The partial arc means one thing only: progress toward the next rung.**
  It never encodes rank, and it renders only at 80 px and up - 40 px
  thumbnails stay binary (achieved / locked) because a fat 80% arc is
  indistinguishable from an achieved ring at that size. Next-up carries
  "N to go" + a linear progress bar in the surrounding layout.
- **States**: locked = hairline `border-2` ring + `text-faint` numeral;
  next-up = locked coin + orange arc (+ copy); **seed-achieved = the SAME
  badge as achieved** - honoured in full, the quietness lives in the caption
  ("already achieved", no date) and the absence of the New dot. Only a fresh
  crossing gets the orange New dot + celebration, once.
- **Two ladders, one family**: identical token, the glyph differentiates -
  footprints = Runs, hand-heart = Leading. No v-prefix, no second colour
  (terrain blue/green and C25K purple stay untouched).
- **Empty state** (0/0): all rungs render locked with next-up 10 -
  aspirational, nothing missing or broken.

### Copy decisions (Paul, in-session)

1. **Bare numbers, no rung names.** The numeral is the badge; generates
   forever with zero copywriting. (C25K programme names stay a C25K thing.)
2. **The ladders are called RUNS / LEADING in-app** (not Volunteering -
   says exactly what earns it; the API's `volunteer` key is unchanged).
3. **Celebration copy is plain milestone**: "200 runs with RTR." /
   "100 nights leading with RTR." - quiet, factual, the badge does the
   celebrating.
4. Volunteer/leading glyph: **hand-heart** confirmed.

### In the Pencil file

- Reusable components **Badge 40 / Badge 80 / Badge 160** (thumbnail / card /
  celebration). States are instance overrides on named layers
  `Coin / Arc / Glyph / Number / Pips`; pips are a text layer ("••") so any
  count is an override, and the arc is an ellipse `sweepAngle` (start 12
  o'clock, clockwise). Trivial to port to RN SVG / email / print.
- Sheets: "Recognition · Badge Grammar · Dark" + "· Light" (rule card, both
  ladders 10→500, all five states, three sizes, empty state), canvas note
  "Note Recognition", and a rough size-test mock "My Ladder · Dark" built on
  Paul's real summary shape (run 160 / volunteer 160, next 200, 40 to go).

Next session: the recognition screen design proper, then the app build.

---

## Session prompt: "My Ladder" screen design (paste into a native-apps thread)

```
Design the recognition display screens for the RTR app in the Pencil file,
using the badge language designed and signed off on 10 Jul 2026. This is
screen design; the app build follows in a later session.

REPO RULE - READ BEFORE COMMITTING ANYTHING TO radcliffe-run
No em dashes in ANY file (docs included) - a CI guard fails the build on
them; the badge session's decision record had to be fixed after the fact.
Use plain hyphens. And staging-first: never push to main; commit to the
working branch, push to staging, Paul approves any merge.

WHERE
The Pencil file at ~/Documents/"RTR app". The badge components (Badge 40 /
Badge 80 / Badge 160, states as instance overrides) and the grammar sheets
("Recognition - Badge Grammar - Dark/Light") already exist in it, plus a
rough size-test mock "My Ladder - Dark" to supersede.

READ FIRST
- radcliffe-run repo: docs/RECOGNITION_DESIGN_BRIEF.md - the badge grammar
  and copy decisions (Runs / Leading naming, bare numbers, plain milestone
  celebration copy). These are DECIDED - do not relitigate.
- radcliffe-run repo: docs/NATIVE_APP_SCOPE.md section 5 - the endpoint
  contract (GET /api/attendance/summary) and v1.1 sequencing.
- docs/PENCIL_DESIGN_BRIEF.md for the M1 file's conventions.

WHAT TO DESIGN (both themes throughout)
1. The final My Ladder screen: both ladders (Runs / Leading) with achieved,
   locked and next-up badges, progress to next ("N to go" + linear bar -
   the badge arc renders only at 80 px and up), and the seed-achieved
   caption treatment ("already achieved", no date, no New dot).
2. WHERE recognition lives - decide with Paul: its own screen off the
   profile, a card on an existing tab that opens the full ladder, or both
   (summary card -> full screen). Respect the M1 tab structure.
3. The celebration moment for a FRESH crossing: New dot + plain milestone
   copy ("200 runs with RTR."), shown once. Design the moment (in-screen
   state, not a push notification - that is the awards job, later).
4. The awards_public consent toggle: private by default; where it sits in
   the profile/consent screens and its explanatory copy. (Backend PATCH
   support does not exist yet - flag it as a build dependency, design it
   anyway.)
5. Empty state 0/0 (new member: all locked, next-up 10) and the
   leader-with-few-runs shape (e.g. 30 / 5) - no ladder may look broken.

REAL DATA FOR MOCKS (live shapes from GET /api/attendance/summary:
{ run: { total, seed, recorded, rungs, nextRung, toNext },
  volunteer: { same }, awardsPublic })
- Paul 160/160 (next 200, 40 to go), Kate 151/119, Neil 160/25, Ros 54/11,
  mid-range ~40/0, newcomer 3/0, empty 0/0.

OUTPUTS
- Final screens in the Pencil file, both themes, superseding the rough mock.
- Exported renders committed to radcliffe-run design/screens/ (hyphens in
  filenames and commit messages - see the repo rule above).
- Placement + toggle decisions appended to this brief in the
  radcliffe-run repo (again: hyphens, not em dashes).
```

---

## Decision record (My Ladder screen session, 10 Jul 2026)

Session held in the Pencil file at `~/Documents/RTR app`, on the badge
language above. All placement and copy decisions taken with Paul in-session.

### Placement (Paul's calls)

1. **Recognition lives in BOTH places**: a compact **Ladder Card on the Club
   tab** (directly under the profile card - latest badge at 40 px, "My
   ladder", "160 runs - 160 leading - 40 to next badge", chevron) opening
   the **full My Ladder stack screen** (back button, no tab bar - the
   standard drill-in grammar). The M1 tab structure is untouched.
2. **The awards_public consent toggle sits at the foot of My Ladder** in a
   SHARING card: "Celebrate my milestones publicly", off by default, with
   the copy: "Off by default. When on, the club may celebrate your new
   badges in roundups and socials. In the app, your ladder is only ever
   visible to you." **BUILD DEPENDENCY**: PATCH support for awards_public
   on /api/profile does not exist yet - backend-first before the app build.

### Screen design rules (settled in-session)

- **Progress fraction** (badge arc + linear bar, identical value):
  `(total - prevRung) / (nextRung - prevRung)` - progress resets to zero at
  each crossing. Paul at 160 shows 60% of the way from 100 to 200, NOT
  160/200. prevRung = highest achieved rung, 0 for none. The grammar
  sheet's next-up example was corrected to match.
- **The LEADING card renders only when the member has leading history**
  (volunteer.total > 0, or the is_run_leader flag). A newcomer at 0/0 sees
  the Runs ladder only - a "LEADING - 10 to go" card would imply members
  are expected to lead.
- **Ladder card anatomy**: count hero (26/800 + unit), 40 px thumbnail
  strip (achieved rungs + next and one future rung, locked - thumbnails
  stay binary per the grammar), next-up row (80 px badge with arc, "N to
  go", "Next badge at N", linear bar), and the seed line ("Badges to 100
  earned before the app - already achieved", history icon, faint).
- **The seed line is data-driven, not time-driven, and never switches
  off**: it renders while any achieved rung has `achieved_on` NULL (rung
  <= seed), and those rungs never gain dates. So it is SCOPED to name the
  seed rungs ("Badges to 100...") and stays true after the first live,
  dated crossing lands above it. If seed = 0 it never renders.
- **Empty state** (0/0): all-locked strip, next-up 10 with a 6 px endowed
  nub on the bar, sub-copy "Your first badge is at 10". Nothing renders
  broken; the SHARING card stays.
- **Celebration = the Milestone screen** (in-screen state, not a push),
  refined with Paul over three feedback rounds: a named greeting
  "Congratulations, {firstName}" (20/800, orange - the first name comes
  from the member profile the app already holds), a celebratory badge
  scene (soft orange glow halo, two hairline ripple rings, confetti dots
  in the orange family ONLY - terrain blue/green and C25K purple stay
  semantic), the milestone line "200 runs with RTR." (28/800), dateline
  ("Crossed Thursday 16 July 2026"), Continue. Shown once, on the first
  open after a fresh crossing - seed rungs never trigger it. The
  shown-once state belongs to the awards machinery (awards table / job),
  which is a later build step.

### In the Pencil file / renders

Frames (all superseding the rough size-test mock, which is deleted):
My Ladder Dark/Light (Paul's 160/160 shape), My Ladder 30-5 Dark/Light
(leader-with-few-runs), My Ladder empty Dark/Light (0/0), Milestone
Dark/Light, and the Club tab updated in place with the Ladder Card (both
themes). Renders committed to design/screens/: recognition-my-ladder-*,
recognition-milestone-*, club-dark/light (replaced), and the corrected
badge grammar sheets.

Next: backend PATCH for awards_public (DONE 11 Jul 2026 - live on
production, commit 995efd1), then the app build of these screens off
GET /api/attendance/summary.

---

## Session prompt: My Ladder app build (paste into a native-apps thread)

```
Build the recognition screens in apps/rtr (the native-apps monorepo at
~/native-apps) against the LIVE production API. The designs, badge grammar
and copy are all decided and signed off - this session is implementation.

READ FIRST
- radcliffe-run repo: docs/RECOGNITION_DESIGN_BRIEF.md - the badge grammar,
  the My Ladder screen decision record (placement, progress fraction, seed
  line, LEADING visibility, celebration spec) and this prompt. Decisions
  there are FINAL - do not redesign.
- radcliffe-run repo: docs/NATIVE_APP_SCOPE.md section 5 - API contracts.
- The Pencil file at ~/Documents/"RTR app" for exact specs: components
  Badge 40 / Badge 80 / Badge 160, states as instance overrides on layers
  Coin / Arc / Glyph / Number / Pips; arc = ellipse sweepAngle from 12
  o'clock. Renders in radcliffe-run design/screens/recognition-*.png and
  club-*.png.

LIVE API (production, both live since 11 Jul 2026; Bearer auth, the same
transport every app route already uses)
- GET /api/attendance/summary ->
  { run: { total, seed, recorded, rungs, nextRung, toNext },
    volunteer: { same shape }, awardsPublic: boolean }
  401 signed out; 404 = signed-in but no member row (handle both).
- PATCH /api/profile with { "awards_public": true|false } -> the SHARING
  toggle. Optimistic update, revert + toast on failure.

WHAT TO BUILD
1. The Badge component (RN SVG) implementing the grammar exactly: coin /
   ring / glyph (footprints = Runs, hand-heart = Leading) / numeral / pips
   (one per hundred); solid orange century fill with #0f0f0f ink; locked
   and next-up states; the partial arc ONLY at 80 px and up (40 px stays
   binary); app theme tokens, both themes.
2. My Ladder screen (drill-in, no tab bar): Runs ladder always; LEADING
   ladder only when volunteer.total > 0 or is_run_leader; per-card anatomy
   from the decision record (count hero, 40 px thumbnail strip, next-up row
   with segment-based fraction (total - prevRung) / (nextRung - prevRung),
   linear bar); the scoped seed line while any rung <= seed ("Badges to
   100 earned before the app - already achieved"); SHARING card at the
   foot; empty state per the design (0/0: all locked, "Your first badge is
   at 10").
3. Club tab Ladder Card under the profile card, opening My Ladder (latest
   badge at 40 px, counts line, chevron). Hide it (or show a join prompt)
   on 404/signed-out per the app's existing patterns.
4. The Milestone celebration screen (named greeting, glow + ripple rings,
   orange-family confetti only, milestone line, dateline, Continue).
   TRIGGERING - decide with Paul in-session: the server-side shown-once
   state (awards table / notified_at) is a LATER build, so either
   (a) RECOMMENDED interim: store last-seen rungs locally; on load, if a
   rung is present that was absent last time AND the previous state was
   non-empty (so seed import / first sign-in never triggers it), show the
   screen once and update local state - the server state supersedes later;
   or (b) build the screen unwired and connect it when the awards job lands.
5. States and behaviours: loading, offline (render last-fetched summary if
   the app caches, else a quiet retry state), pull-to-refresh consistent
   with the app's other screens.

VERIFY before calling it done: real sign-ins against production - Paul's
account (160/160, next 200, 40 to go, seed line visible), a plain member,
and if possible a fresh account for the 0/0 empty state. Both themes,
Android + iOS.

IF COMMITTING ANYTHING TO radcliffe-run (decisions appended to this brief,
render updates): no em dashes anywhere (CI guard), plain hyphens; commit to
the working branch and push to staging only - Paul approves merges.
```

---

## Decision record (app build session, 11 Jul 2026)

Built in the native-apps monorepo (apps/rtr), all screens to the signed-off
designs: the LadderBadge component (RN SVG, the full badge grammar in one
generative token), the My Ladder drill-in, the Club tab Ladder Card, and the
Milestone celebration screen, consuming GET /api/attendance/summary and
PATCH /api/profile (awards_public).

- **Milestone triggering: interim option (a) implemented** (the prompt's
  recommended path). Last-seen rungs live locally per member
  (`rtr.ladder.seen.v1.<memberId>`); a rung present that was absent in the
  stored snapshot celebrates once. No stored snapshot (first sign-in, new
  install, seed import) stores silently and never celebrates - so the first
  NEW crossing is the first celebration. Marked seen at presentation, checks
  serialised across screens. The server-side awards machinery (dated
  crossings, notified_at) supersedes this when it lands.
- **CORS**: `/api/attendance` added to APP_API_PATHS (lib/appCors.ts + test).
  Native fetch never needed it; the app's browser-preview verification loop
  does. Auth is still enforced per-route - CORS is not a security layer.
- **Verified** against a live stack (dev Supabase project + local site, a
  minted member session): all ladder shapes (160/160, 30/5, 0/0), both
  themes at 375x812, the sharing toggle round-trip written to and read back
  from the DB, the milestone trigger firing once and never re-firing, the
  Club card hiding signed-out, zero console errors. The seed line correctly
  re-scopes ("Badges to 25 ...") when the seed sits below 100. Production
  endpoints probed (401 signed out, CORS preflight). Device pass on Paul's
  phone (production build, real account) is the remaining verification.

---

## Naming amendment (Paul, 11 Jul 2026): "My Ladder" becomes "Milestones"

Paul's call on reflection after using the built app: the member-facing
feature is called **Milestones**, not "My Ladder". It matches the consent
copy ("Celebrate my milestones publicly"), the Milestone celebration
screen, and the digest language - one word across every surface.

Scope of the rename (a small native-apps change):
- Screen title "My Ladder" -> "Milestones"; the Club tab card label
  "My ladder" -> "Milestones"; any other user-facing "ladder" strings.
- Pencil file frame names updated to match when next touched.
- NOT changed: the API (`/api/attendance/summary`, `volunteer` key), and
  ladder/rung as internal vocabulary in code, docs and these briefs -
  technical terms, not member-facing copy.

Any future session reading the decision records above: where they say
"My Ladder" for a screen or card, read "Milestones".
