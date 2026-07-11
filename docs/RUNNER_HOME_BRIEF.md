# Runner home + development - research brief

**What this is.** A self-contained prompt for the RESEARCH session that
precedes the runner-home workshop. Written 11 Jul 2026 from Paul's thinking
after a few days using the built app. The output is an evidence brief and a
straw-man home design FOR PAUL TO REACT TO in an interactive workshop -
this session makes NO decisions and builds NOTHING.

**Paul's direction (11 Jul 2026).** The app works; milestones will help
engagement. The opportunity is bigger: each runner should have a bespoke,
warm HOME - their milestones, the next run, the group they typically pick
shown large with others smaller - plus gentle runner development. The
keystone insight: nearly every runner says they are "too slow" for the 8k
or "don't want to hold people up", missing that leaders exist to support
them - the barrier is a misread social contract, not ability.

---

```
Research and propose the personalised runner home for the RTR app. Output:
(a) a short evidence brief, (b) a straw-man home design to react to, (c) a
workshop agenda of decisions for Paul. Decide nothing; build nothing.

READ FIRST
- docs/C25K_ENGAGEMENT_RESEARCH.md - the evidence base already gathered:
  sections 2 (what works), 3 (what backfires), 4 (social dimension),
  "Design principles for RTR" (all 11 bind this work), and the 6 Jul
  workshop decisions.
- docs/RECOGNITION_DESIGN_BRIEF.md + docs/ATTENDANCE_RECOGNITION_BRIEF.md
  decision records - what exists, what the data means, naming
  ("Milestones", not ladder).
- docs/AWARDS_LOOP_BRIEF.md - the awards loop runs independently of this.

PAUL'S IDEAS TO DEVELOP (with the constraints already known)
1. Bespoke home: named, warm; Milestones summary + next run as the core.
   "Thursday's 8k is led by Kate" is now possible (run_leadership, live
   era). Currently the tab is a generic "runs" list.
2. Preferred-group tile: their usual pick (e.g. 8k) large, others small.
   DATA CAVEAT: group_key is reliable only from live check-in (9 Jul 2026
   onward); photo-era rows mostly lack it. Needs ~3 live check-ins before
   confident; design the cold-start default.
3. Progression encouragement - THE KEYSTONE: runners self-describe as "too
   slow" for the 8k / "don't want to hold people up". Design tenets to
   develop, not relitigate:
   - Lead with STRUCTURE, not pep: the back marker is a staffed role whose
     job is the last runner; concrete facts (back-of-group pace, duration,
     regrouping) beat encouragement, which argues with self-assessment.
   - HUMAN VOICES: named leader ("I run at the back on purpose") + member
     vicarious quotes ("I thought I'd hold everyone up. Nobody does.").
   - Dissolve the identity cliff: with real group_key data, show that
     moving between groups is normal ("plenty run 8k some weeks, 5k
     others") - not a ladder you fall off.
   - TIMING: attach invitations to warm moments (just after a milestone
     celebration), never cold pushes. Once, dismissible forever.
   - Same pattern serves C25K graduation in January ("am I really a club
     runner?" is the same fear one rung down).
4. Development preferences: ask ONCE how they'd like to develop (get
   fitter, first race, etc); signpost - pace groups, parkrun, route
   library, England Athletics resources. NOT coaching (out of scope: RTR
   leaders are not coaches - keep the liability line clean). Needs one
   small schema addition (member development preference) - flag for the
   workshop, do not design the schema here.
5. Route familiarity: NEVER claim "new to you" (unprovable pre-app, wrong
   and mildly insulting when wrong). Show familiarity only when provable:
   "You've run this route 3 times" (derivable live-era only, via
   group_key -> night's run row; the anchor caveat in
   ATTENDANCE_RECOGNITION_BRIEF applies). Absence of a claim cannot lie.
6. Solo section: signpost the route library and walks for running alone.
   Solo runs do NOT count toward milestones (decided scope) - it must feel
   like a gift, not a tracked obligation. Walks likely needs a tiny API.
7. Additions already agreed worth developing: collective stat ("38 of us
   ran last Thursday" - comparison-free), return-friendly framing (a
   six-week gap changes nothing; never guilt, "we missed you" stays
   deferred).

RESEARCH QUESTIONS (external pass; add to, don't limit to)
- Social-norms misperception interventions in exercise settings: does
  correcting "everyone is faster than me" beliefs move participation, and
  what copy shapes work?
- Self-efficacy sources ranked for exercise adoption (mastery, vicarious,
  persuasion) - what should the reassurance screen lean on?
- Home-screen personalisation in comparable apps (parkrun app, Strava,
  Runna, NRC, club apps): what do they surface first, what feels warm vs
  surveillance-y, what do users report hating?
- Group-run "no-drop / sweeper" communication: how do clubs successfully
  advertise the back-marker contract to hesitant runners?
- Progression prompts: evidence on invitation timing (post-achievement
  receptivity), frequency caps, and dismissal design.
- Anything on "development pathway" features that stay on the right side
  of signposting vs coaching.

HARD CONSTRAINTS (from the 11 design principles - restate in the brief)
- Attendance, never performance. No streaks. No member-vs-member
  comparison. Private by default. Few, event-anchored notifications.
  Amplify Thursday night, never simulate it. Nothing exists "to drive
  engagement" as an end in itself.

DELIVERABLES
(a) Evidence brief: findings with confidence levels and sources, in the
    mould of C25K_ENGAGEMENT_RESEARCH.md, appended to this file.
(b) Straw-man home: a written surface-by-surface proposal (sketch-level,
    not Pencil) covering hero, preferred-group tile + cold start, the
    progression invitation (trigger, copy shape, dismissal), development
    preference ask, route familiarity, solo section, collective stat -
    each marked with the data it needs and whether that data exists today.
(c) Workshop agenda: the numbered list of decisions Paul must make, each
    with options and a recommendation. Paul wants the follow-on sessions
    INTERACTIVE - the workshop reacts to the straw-man; the later Pencil
    session iterates with him screen by screen, never presenting a fait
    accompli.

REPO RULES: no em dashes anywhere (CI guard); commit to the working
branch, push to staging only; this is a docs-only session.
```
