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

---

# (a) Evidence brief (research session, 11 Jul 2026)

Confidence key as in `C25K_ENGAGEMENT_RESEARCH.md`:
**High** = peer-reviewed meta-analysis / replicated result. **Medium** =
single peer-reviewed study or robust extrapolation. **Low / lore** =
industry data, UX pattern literature, or design reasoning; plausible
mechanism, weak methodology.

## 1. The keystone: "too slow" is a misread contract, and structure fixes it

- **Feeling too unfit is a documented, gendered barrier to group running.**
  parkrun's barrier research (BMC Public Health 2022) finds the
  psychological fear of not being fit enough is a principal barrier to
  initiating participation, reported more by women (RTR's likely majority).
  A Scotland cohort study of first-time parkrunners adds the self-fulfilling
  half: finishers over 40 minutes returned at disproportionately low rates -
  the fear is real, and where the event does nothing structural, the
  experience confirms it. Confidence: **High** (multiple studies, consistent
  direction).
  Sources: [PMC8759213](https://pmc.ncbi.nlm.nih.gov/articles/PMC8759213/),
  [PMC10431652](https://pmc.ncbi.nlm.nih.gov/articles/PMC10431652/)
- **Structural roles beat reassurance - the parkwalker natural experiment.**
  parkrun made the tail walker compulsory in 2017 ("no one finishes last"
  as a designed guarantee, not a promise), then added the parkwalker role in
  Oct 2022 - a staffed, visible role whose whole job is walking with people.
  parkrun reports a 69% increase in walkers since; a University of Stirling
  analysis (Jan 2026) found a 55% increase, strongest among women and older
  participants - the exact population the fear evidence identifies. A staffed
  role legitimising the back of the field moved participation where copy
  alone had not. This is the closest analogue to RTR's back marker and the
  strongest single support for the "lead with structure, not pep" tenet.
  Confidence: **Medium-high** (large-N natural experiment, no RCT).
  Sources: [Stirling, Jan 2026](https://www.stir.ac.uk/news/2026/january-2026-news/participation-in-parkrun-surging-thanks-to-parkwalkers-new-stirling-research-shows/),
  [parkrun tail walker role](https://resources.parkrun.com/resources/volunteer-roles-explained-tail-walker)
- **Norm-misperception correction works, but the copy shape matters.** The
  social norms approach rests on people misperceiving peers' behaviour and
  attitudes. An RCT (N=111) found descriptive-plus-injunctive norm feedback
  raised physical activity over the short term; a larger adolescent RCT
  found adding personal identification to norm messages added nothing; a
  critical appraisal warns that generic "norm messages" without a real,
  measured misperception often fail. Reading: the effective form is a
  concrete, TRUE, descriptive fact about the group, delivered plainly -
  not exhortation, and never anything that singles the member out.
  Confidence: **Medium**.
  Sources: [PubMed 28213634](https://pubmed.ncbi.nlm.nih.gov/28213634/),
  [PMC7457489](https://pmc.ncbi.nlm.nih.gov/articles/PMC7457489/),
  [PMC6232455](https://pmc.ncbi.nlm.nih.gov/articles/PMC6232455/)
- **Intimidation research points at perceived descriptive-norm mismatch.**
  Work on gym intimidation (power-threat-meaning framework) finds believing
  you are unlike the others present drives intimidation, and that meeting
  the group's descriptive norm is protective even when an idealised standard
  is not met. "Plenty of Thursday regulars run 8k some weeks and 5k others"
  targets the actual mechanism: it corrects the perceived norm rather than
  arguing with the member's self-assessment. Confidence: **Low-medium**
  (recent framework paper, qualitative).
  Source: [Frontiers in Sports and Active Living 2026](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1712367/full)
- **Self-efficacy sources, empirically ranked for physical activity.** A
  2025 dominance analysis (N=335 adults) ranks the sources by share of
  explained variance in PA self-efficacy: mastery experience 18.4%, verbal
  SELF-persuasion 15.8%, affective states ~11-12%, vicarious experience
  2.3%, verbal persuasion BY OTHERS 1.0%. Caveats: single study, sample
  skews active (maintenance, not initiation); the authors suggest vicarious
  experience matters more when INITIATING a new behaviour. Four readings
  for this feature, in order of force:
  1. Generic encouragement from an app is the WEAKEST lever measured -
     "encouragement argues with self-assessment" is what the data says.
  2. The strongest lever is a real mastery experience - so the invitation's
     true job is making the first 8k attempt guaranteed-survivable
     (structure), after which the experience does the persuading.
  3. Facts a member can repeat to themselves ("the back marker stays with
     the last runner - that is the job") work as self-persuasion, the
     second-ranked source. Structure copy doubles as self-persuasion
     ammunition.
  4. Vicarious quotes still earn their place for the initiation moment
     specifically, despite the low maintenance-phase rank.
  Confidence: **Medium** (single study; direction consistent with the wider
  Bandura literature).
  Source: [PMC12502103](https://pmc.ncbi.nlm.nih.gov/articles/PMC12502103/)

## 2. Invitation timing, frequency, dismissal

- **Receptive-moment delivery is the JITAI core principle**: support lands
  "at the moment the person needs it most and is most likely to be
  receptive". Combined with the fresh-start effect already in the evidence
  base (aspiration spikes at temporal landmarks), a just-crossed milestone
  is a plausible warm moment: competence is momentarily high and the member
  is already looking at an achievement surface. Direct evidence for
  post-achievement receptivity to PROGRESSION invitations specifically is
  thin - treat the timing as a well-grounded bet, not a proven result.
  Confidence: **Medium** for receptivity/timing in general; **Low** for the
  specific post-milestone claim.
  Source: [PMC5364076](https://pmc.ncbi.nlm.nih.gov/articles/PMC5364076/)
- **The downside risk is asymmetric.** Cold or repeated pushes are the
  documented opt-out driver (notification evidence already in
  C25K_ENGAGEMENT_RESEARCH.md section 3); a single, dismissible, in-app
  invitation at a warm moment risks almost nothing. Once-and-dismissible has
  no direct trial evidence; it follows from the opt-out literature plus
  autonomy (an invitation the member controls supports autonomy; a repeating
  nudge is imposed). Design consequence: show once, dismiss forever, but
  keep the CONTENT permanently reachable somewhere low-key so the door
  never closes and dismissal costs nothing. Confidence: **Low** (design
  reasoning) resting on **High** adjacent evidence.

## 3. Home-screen personalisation: what comparable products teach

- **The personalisation-privacy paradox is real and has a clean escape.**
  Users like personalised content but distrust the data trail. A Penn State
  study found users strongly prefer recommendations based on SELF-REPORTED
  preferences; over 96% switched away from social-media-inference
  personalisation when given a choice; having choices itself built trust.
  Escape for RTR: personalise only from what the member knowingly gave
  (check-ins a leader did in front of them, preferences they typed), show
  provenance inline ("based on your check-ins"), make every inference
  correctable in one tap. Warm vs surveillance-y is exactly the line
  between disclosed-and-correctable and inferred-and-silent. Confidence:
  **Medium** (news summary of a single study; mechanism consistent across
  the paradox literature).
  Sources: [PSU ICDS](https://www.icds.psu.edu/app-users-wary-of-health-and-fitness-recommendations-based-on-social-media-data/),
  [PMC9309778](https://pmc.ncbi.nlm.nih.gov/articles/PMC9309778/)
- **parkrun's app leads with celebration and gets crowding complaints.**
  The relaunched official app reorganised its home around the milestone
  widget and a wall of badges; user feedback complains celebration crowds
  out utility (a badge taking three quarters of the screen). Lesson:
  milestones belong on the home as a compact summary card, not the hero.
  Confidence: **Lore**.
  Source: [The Easy Run review](https://www.theeasyrun.com/parkrun/the-new-parkrun-app-is-here-but-is-it-actually-better-than-the-5k-app/)
- **Strava's recurring redesign backlash is about displaced utility.** Each
  layout change draws the same complaint shape: the thing users open the
  app for gets pushed down or moved, and novelty is stacked on top. Lesson:
  RTR's hero must stay the one thing everyone opens the app for - when and
  where is the next run - and layout STABILITY is itself a feature.
  Personalisation should change what fills the slots, rarely the slots.
  Confidence: **Lore**.
  Source: [Strava community thread](https://communityhub.strava.com/strava-features-chat-5/new-layout-is-beyond-awful-8990)
- **Training apps put "your next session" first.** Runna's home is the next
  planned workout; NRC similar. Consistent with next-run-as-hero. **Lore**.
- **Self-set beats imposed for goals.** The SDT taxonomy of app features:
  self-set goals support autonomy; app-imposed goals undermine motivation.
  Focus-group work with sedentary users confirms autonomy-supportive
  features (own goals, tailored feedback) are valued. The development
  preference ask must be optional, skippable, and member-editable - never
  a wizard that assigns a pathway. Confidence: **Medium-high**.
  Sources: [IJHCS 2020 SDT taxonomy](https://www.sciencedirect.com/science/article/pii/S1071581920300513),
  [PMC7704278](https://pmc.ncbi.nlm.nih.gov/articles/PMC7704278/)

## 4. Signposting vs coaching: where the line sits

- **The LiRF / CiRF boundary is explicit in England Athletics' framework.**
  LiRF (Leadership in Running Fitness) leaders are insured to LEAD group
  runs within the course content: safe routes, warm-ups/cool-downs, simple
  inclusive activities from pre-defined session cards. Planning or designing
  structured training programmes, coaching technique, and guiding
  performance progression belong to CiRF (Coach in Running Fitness) and
  above. RTR leaders are LiRF-shaped; nothing in the app may put them, or
  the club, on the coaching side of that line. Confidence: **High**
  (regulatory documents).
  Sources: [England Athletics LiRF](https://www.englandathletics.org/coaches-and-officials/coaching-qualifications/leadership-in-running-fitness/),
  [UKA C25K leader requirements](https://www.uka.org.uk/wp-content/uploads/2023/03/230321-Couch-to-5K-Leader-Requirements-March-2023.pdf)
- **Safe side**: pointing at existing self-serve resources (pace groups,
  parkrun, the route library, England Athletics / NHS resources), stating
  facts about club sessions, celebrating attendance. **Unsafe side**:
  generating training plans, prescribing paces, distances or progressions,
  any adaptive "your next step is X" logic. The development feature is a
  signposting MENU, not a pathway engine - which also keeps it honest under
  principle 1 (attendance, never performance).

## 5. Collective stat and return framing (consolidating existing evidence)

- "38 of us ran last Thursday" is descriptive-norm social proof with no
  comparison surface - the same mechanism as section 1's norm correction,
  pointed at belonging instead of ability. Cohort collective totals were
  already adopted on 6 Jul; this extends the same shape to the whole club.
  Data exists (live check-ins). Confidence: **Medium** (mechanism), and it
  is the club's own true number either way.
- Return framing: counts only go up; a gap changes nothing (principles 2-3).
  "We missed you" stays DEFERRED (decided 6 Jul - regulars missing weeks is
  life, not dropout). Consequence for the home: it must render identically
  after a six-week gap - no state that admits guilt copy exists.

## Hard constraints (restated - all 11 principles bind)

Attendance, never performance. Counts only go up - no streaks, no decay.
Build for return - never guilt. Private by default, celebrated by consent.
No member-vs-member comparison, ever. Recognition routes through humans.
Amplify Thursday night, never simulate it. Registration is session zero.
Capture costs members nothing. Notifications are few and event-anchored.
Measure before mechanising. Nothing exists "to drive engagement" as an end
in itself.

---

# (b) Straw-man home (to react to, not decided)

The Runs tab today is a generic list: next-run hero + upcoming feed. The
straw man keeps that skeleton (the hero stays the one thing everyone opens
the app for) and makes each slot personal. Surfaces top to bottom as a
member would scroll. Every surface carries a DATA line stating what it
needs and whether that exists today; nothing here claims data we do not
have.

**Signed-out / no-member state:** the home degrades to what the Runs tab
already is (runs are anon reads) - generic next run, no greeting, no
personal cards. Nothing renders broken; sign-in is invited once, quietly.

### 1. Hero: greeting + next run, preferred group large

"Evening, Kate." over the next run card (date, time, meeting point, on-tour
banner, cancelled state - the existing card grammar). Below it the night's
groups as tiles: the member's usual group rendered large (8k with its
route), the others small but always present and tappable. A one-line
provenance note on the large tile: "your usual group, from your check-ins" -
tap to switch or clear. No leader names on upcoming runs; instead one
standing role line: "Every group has a leader at the front and the back."

- DATA: runs + routes exist (anon reads). First name exists (`/api/me`).
  Preferred group DOES NOT exist as a field - derive from
  `attendance.group_key`, live era only (reliable 9 Jul 2026 onward;
  photo-era rows mostly lack it). Needs ~3 live check-ins for confidence -
  cold start below. The role line needs NO data and is always true -
  naming the leader of an upcoming run was considered and dropped
  (Paul, 11 Jul - reaction record below): leader roles are voted week by
  week, so names are volatile, and the reassurance that matters is that
  the roles exist.

### 2. Preferred-group tile cold start

Until the member has 3+ live check-ins with a clear majority group, all
group tiles render equal-size (the current generic behaviour, which is
correct when we know nothing). Mixed history (no majority) also renders
equal - that IS the fact, and it quietly normalises moving between groups.
Never ask the member to declare a group: a declared group is an identity,
and the keystone problem is members over-identifying with "their" group.
Inference from behaviour plus one-tap correction is warmer than a form and
avoids hardening the identity cliff (workshop decision 2).

- DATA: same as surface 1. Threshold (3) is a guess for Paul to calibrate.

### 3. Milestones summary (compact, never the hero)

The existing Ladder Card grammar (latest badge at 40px, counts line,
next-rung progress, chevron into Milestones). One card height, never more -
the parkrun app's badge-wall crowding complaint is the cautionary tale.
Celebration stays in the Milestone screen; the home only summarises.

- DATA: exists - `GET /api/attendance/summary`, card built (Club tab).
  Decision needed on whether it moves to home or renders in both places
  (workshop decision 3).

### 4. Collective stat (one line, comparison-free)

A single quiet line under the hero: "38 of us ran last Thursday." Nothing
about who, nothing about the member's own count here, no trend arrows. In
C25K season it can carry the cohort variant ("14 of your cohort ran
Tuesday") per the 6 Jul decision.

- DATA: exists, live era - count DISTINCT members checked in on the most
  recent qualifying run date (`run_type IN ('regular','c25k')`, not
  cancelled, per the AGENTS.md counting invariant).

### 5. The progression invitation (the keystone surface)

- **Trigger**: shown ONCE, on the home, at the first milestone celebration
  moment for a member whose usual group is 5k (i.e. immediately after the
  Milestone screen's warm moment, not as a push, never cold). Milestone
  crossings become server truth when the awards job ships
  (AWARDS_LOOP_BRIEF); the app already has the interim local trigger.
- **Copy shape** (order is the evidence, section (a)1):
  1. STRUCTURE, the guarantee: "The 8k has a back marker - a leader whose
     whole job is running with the last person. Nobody runs alone, and the
     group regroups on the way round." Plus the concrete facts: typical
     back-of-group pace, duration, regroup points.
  2. NORM, descriptive and true: "Plenty of Thursday regulars run 8k some
     weeks and 5k others."
  3. VOICES: a back marker speaking AS THE ROLE, not a rota promise ("I
     run at the back on purpose - that is the job", attributed to "one of
     our back markers"; named only if a leader is happy to be - workshop
     decision 6), and one member quote ("I thought I would hold everyone
     up. Nobody does.").
  4. Never "You can do it!" - persuasion argues with self-assessment and
     is the weakest measured source.
- **Dismissal**: two affordances - "Maybe another week" (card goes, no
  state change) and "Don't show this again" (forever). Either way the same
  content lives permanently on a low-key "About the groups" page reachable
  from run detail, so dismissing costs nothing and the door stays open.
- **January reuse**: the same component with swapped copy serves C25K
  graduation ("am I really a club runner?" is the same fear one rung
  down) - graduation is itself a milestone moment, so the trigger shape
  is identical.

- DATA: usual group as above (live era). Milestone trigger: interim local
  now, `awards` machinery when built. The COPY is the real dependency:
  back-of-group pace, regroup facts, a back marker's line and a member
  quote (with consent) do not exist anywhere and must be collected from
  humans - workshop decisions 5 and 6.

### 6. Development preference ask (once, skippable, editable)

One card, one question: "How would you like your running to develop?" -
options like: get fitter / run further / a first race or parkrun / just
enjoy Thursdays. Answering swaps the card for a signposting row matched to
the answer: pace groups (About page), parkrun, the route library, England
Athletics / NHS resources. "Just enjoy Thursdays" is a first-class answer
that produces no signposts and no follow-up - it must be as respected as
any other. Skippable ("not now" - card leaves the home, ask lives on in
profile); answer editable in profile forever. No plans, no paces, no
prescriptions - signposting only (the LiRF line, section (a)4).

- DATA: does not exist - needs one small schema addition (member
  development preference). Flagged for the workshop; NOT designed here
  per the brief.

### 7. Route familiarity (only when provable)

On the next-run card and run detail: "You've run this route 3 times."
Rendered ONLY when the count is provable from live-era data; otherwise
nothing renders - absence of a claim cannot lie. NEVER "new to you"
(unprovable pre-app, insulting when wrong).

- DATA: derivable live era only: member's `group_key` per night -> that
  night's run row for that group (jeff falls back to the 5k row - the
  anchoring caveat in ATTENDANCE_RECOGNITION_BRIEF applies) -> `route_slug`
  -> count. Needs a small server derivation (backend-first rule: the app
  holds no logic). Counts will be small until autumn - display threshold
  is workshop decision 7.

### 8. Solo section (a gift, not a tracker)

A small card at the foot: "Running solo this week?" -> the route library
(in-app, exists) and the walks library. No logging, no self-report, no
counting - solo runs do not count toward milestones (decided scope) and
this surface must never imply they should. It is the club handing you a
map, not watching you run.

- DATA: routes exist in-app (`GET /api/routes`). Walks data is site-bound
  (`lib/walks.ts`, no API) - needs a tiny read-only endpoint or bundled
  data (workshop decision 8).

### What the home NEVER shows

Pace, distance PBs, or any performance number. Streaks or gap-counting of
any kind. Any other member's name or count (except a consented leader
voice in the invitation). "New to you" or any unprovable claim. Guilt copy
in any state - the home after a six-week gap is pixel-identical to the
home after none. Engagement mechanics with no Thursday behind them.

### Data dependency summary

| Surface | Exists today | Missing |
|---|---|---|
| Greeting + next run hero | yes (runs anon, /api/me) | - |
| Preferred-group tile | group_key live era (9 Jul on) | ~3 check-ins volume; derivation endpoint |
| Milestones summary | yes (summary API + card) | placement decision |
| Collective stat | yes (live check-ins) | tiny aggregate endpoint |
| Progression invitation | usual-group + interim trigger | awards job (in flight); THE COPY (humans) |
| Development ask | no | schema addition (workshop flag) |
| Route familiarity | derivable live era | derivation endpoint; data volume |
| Solo section | routes API | walks API (tiny) |
| Role line ("leader at front and back") | needs no data - always true | - |

A practical build note (not a decision): most personalised surfaces want
one aggregate `GET /api/home` payload (member, usual group, next run,
familiarity count, collective stat, milestone summary ref) rather than the
app assembling five calls - consistent with the backend-first rule. Design
it at build time, not here.

---

# (c) Workshop agenda - decisions for Paul

Format: interactive, reacting to the straw man surface by surface. Each
decision has options and a recommendation; nothing is decided until Paul
says so. The later Pencil session iterates the chosen shape screen by
screen with him - never a fait accompli.

1. **Home identity.** (a) The Runs tab BECOMES the personalised home
   (same tab count, hero stays first) - RECOMMENDED; (b) a separate new
   Home tab (five tabs incl. leader Check-in); (c) personalise the Club tab
   instead. Straw man assumes (a): the runs list is already the de facto
   home, and stability-of-slots is the lesson from Strava's backlash.
2. **Preferred-group cold start and inference.** (a) Infer from live
   check-ins, equal tiles until 3+ with a majority, one-tap correct -
   RECOMMENDED (warm, no identity form, matches the privacy-paradox
   evidence for disclosed provenance); (b) ask once at first open ("which
   group do you usually run with?") - simpler, but hardens the identity
   the keystone wants to dissolve; (c) default everyone to 5k-large.
   Also calibrate: is 3 check-ins the right threshold?
3. **Milestones card placement.** (a) Home AND Club tab (same card twice) -
   RECOMMENDED, cheap and consistent; (b) move to home, remove from Club;
   (c) Club only (status quo). Also: does the Milestone celebration screen
   hand off to the home (where the progression invitation waits) or back
   to where the member was?
4. **Progression invitation trigger.** (a) First milestone celebration for
   a 5k-usual member, once ever - RECOMMENDED (warmest moment, lowest
   risk); (b) every milestone until engaged-or-dismissed (more chances,
   more nag risk); (c) also allow a time-based fallback for members who
   never cross a rung (contradicts "warm moments only" - included for
   completeness, recommend against). Plus: confirm the two-button
   dismissal ("Maybe another week" / "Don't show this again") and the
   permanent "About the groups" page as the always-open door.
5. **The structural facts.** What ARE the 8k's true back-of-group pace,
   duration, and regroup points? Who confirms them (the leaders who run
   the back)? These facts are the invitation's spine and only leaders can
   supply them. Decide the collection route (a WhatsApp ask vs at the
   next leaders' meeting) and where they live (site content vs app copy).
6. **The voices.** The back-marker line is attributed to the ROLE ("one
   of our back markers") unless a specific leader is happy to be named -
   Paul leans unnamed for weekly runs (reaction record below). Which
   member gives the vicarious quote? Quotes need asking and explicit
   consent (a member quote about being slow is personal -
   photo_consent-grade care). Decide who Paul asks and the consent shape.
7. **Route familiarity threshold and placement.** Show from (a) the 2nd
   run of a route ("you've run this route before" reads warmer than a
   count of 1) - RECOMMENDED; (b) from the 1st; (c) defer the surface
   until autumn data volume exists. Placement: next-run card + run detail
   (straw man) or run detail only.
8. **Solo section scope.** (a) Routes + walks, build the tiny walks API -
   RECOMMENDED; (b) routes only, walks later; (c) defer the section. Also
   confirm the no-logging stance stands (it is the decided scope; restated
   because the workshop could be tempted).
9. **Upcoming-run leader line - SETTLED (Paul, 11 Jul, reaction record
   below).** Weekly runs never name leaders: roles are voted on week by
   week and subject to change, so names are a logistical liability, and
   the reassurance that matters is that the roles EXIST. The home carries
   the standing role line ("every group has a leader at the front and the
   back") - always true, zero data, zero logistics. This also removes the
   leader-signup feature as a dependency of this thread entirely. C25K is
   the exception: a named cohort contact is stable for ten weeks and
   stays viable (already the decided welcome-email shape from 6 Jul).
10. **Development preference schema flag.** Confirm the feature is wanted;
    settle the question wording and the options list (straw man: get
    fitter / run further / first race or parkrun / just enjoy Thursdays);
    agree that the schema addition (single preference field vs multi-select)
    is designed in a build session, not the workshop. Also: does the
    answer ever influence email content, or app-only for now?
11. **Collective stat copy.** Confirm "38 of us ran last Thursday" shape
    and placement (one line under the hero). C25K-season cohort variant
    per the 6 Jul decision. Decide the quiet-week behaviour (a cancelled
    Thursday means the line simply shows the previous run - no zero
    states).
12. **Sequencing.** What ships in the first home build vs waits: the hero,
    milestones card, collective stat and solo section have their data
    today; the preferred-group tile and route familiarity want a few more
    weeks of live check-ins (which accumulate regardless); the progression
    invitation waits on the awards job plus the human copy (decisions 5-6);
    the development ask waits on its schema flag. Recommendation: build
    the home shell with the always-available surfaces first, light the
    data-dependent surfaces as their data matures - each lights up without
    a layout change (stability-of-slots again).
13. **January reuse check.** Confirm the progression invitation component
    doubles as the C25K graduation bridge (same trigger shape: graduation
    milestone; swapped copy: "plenty of graduates run with the 5k group -
    it is the same Thursday night"). If yes, nothing extra is built in
    January beyond copy. The C25K variant MAY carry a named contact - the
    cohort leader is stable for ten weeks, so naming is logistically easy
    there and already the decided welcome-email shape.

---

## Paul's first reaction (11 Jul 2026, on reading the straw man)

Recorded ahead of the workshop so the session starts from the current
shape:

- **No named leaders on weekly runs, anywhere on the home.** Leader roles
  are voted on week by week and subject to change, so names are a
  logistical liability - and the reassurance that matters is that the
  roles EXIST ("there will be someone at the front and the back"), not
  who fills them. This settles workshop decision 9 and tilts decision 6
  toward role-attributed voices. It also sits comfortably with the
  evidence: parkrun's guarantee is that A tail walker exists, never a
  named one - the structural assurance was never about identity.
- **C25K is the exception**: a named cohort contact is stable for ten
  weeks and stays viable (already the decided welcome-email shape from
  the 6 Jul workshop).

## Source list (this session's additions)

Peer-reviewed:
- [Barriers to initiating and maintaining participation in parkrun, BMC Public Health 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8759213/)
- [Predictors of successful return to parkrun for first-time adult participants in Scotland](https://pmc.ncbi.nlm.nih.gov/articles/PMC10431652/)
- [Social norm interventions to increase physical activity RCT, Annals of Behavioral Medicine 2017](https://pubmed.ncbi.nlm.nih.gov/28213634/)
- [Social norm-based intervention with observable behaviour, adolescents RCT](https://pmc.ncbi.nlm.nih.gov/articles/PMC7457489/)
- [Critical appraisal of the social norms approach](https://pmc.ncbi.nlm.nih.gov/articles/PMC6232455/)
- [Empirical ranking of the sources of self-efficacy for physical activity, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12502103/)
- [Understanding social gym intimidation, Frontiers in Sports and Active Living 2026](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1712367/full)
- [JITAIs in mobile health: key components and design principles](https://pmc.ncbi.nlm.nih.gov/articles/PMC5364076/)
- [Apps That Motivate: SDT taxonomy of app features, IJHCS 2020](https://www.sciencedirect.com/science/article/pii/S1071581920300513)
- [Engagement features in PA apps: focus groups with sedentary people](https://pmc.ncbi.nlm.nih.gov/articles/PMC7704278/)
- [A personalized mobile app for physical activity: mixed-methods study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9309778/)

Industry / institutional / lore (flagged as such in text):
- [University of Stirling parkwalker analysis, Jan 2026](https://www.stir.ac.uk/news/2026/january-2026-news/participation-in-parkrun-surging-thanks-to-parkwalkers-new-stirling-research-shows/)
- [parkrun tail walker role explainer](https://resources.parkrun.com/resources/volunteer-roles-explained-tail-walker)
- [Penn State ICDS: app users wary of social-media-based recommendations](https://www.icds.psu.edu/app-users-wary-of-health-and-fitness-recommendations-based-on-social-media-data/)
- [England Athletics: Leadership in Running Fitness](https://www.englandathletics.org/coaches-and-officials/coaching-qualifications/leadership-in-running-fitness/)
- [UKA Couch to 5K leader requirements (PDF)](https://www.uka.org.uk/wp-content/uploads/2023/03/230321-Couch-to-5K-Leader-Requirements-March-2023.pdf)
- [The Easy Run: the new parkrun app reviewed](https://www.theeasyrun.com/parkrun/the-new-parkrun-app-is-here-but-is-it-actually-better-than-the-5k-app/)
- [Strava community: layout backlash thread](https://communityhub.strava.com/strava-features-chat-5/new-layout-is-beyond-awful-8990)

---

# Workshop decision record (11 Jul 2026)

Workshop held in-session the same day as the research pass; Paul reacted
to the straw man decision by decision. All 13 agenda items are resolved.
The straw-man surfaces above stand except where amended here; where this
record and the straw man differ, this record wins.

**Cross-cutting rule (added by Paul mid-workshop): leaders are opted out
of behavioural interventions.** A leader's check-ins encode where they
were NEEDED, not what they would choose - so any surface that reads
attendance as preference or ability excludes `is_run_leader` members.
Applies to both progression pathways (a leader with ten 5k nights is on
duty, not stuck). The preferred-group tile REMAINS leader-inclusive - the
group they usually lead is still the right answer to "what is my Thursday" -
but the Pencil session should check whether leaders want a different tile
treatment.

1. **Home identity: the Runs tab becomes the personalised home.** Same
   tab count, hero stays first. Whether the tab label changes from
   "Runs" is a Pencil-session detail.
2. **Preferred-group tile: inferred, never asked.** Equal tiles until 3+
   live check-ins show a majority group; provenance line ("your usual
   group, from your check-ins"); one-tap correction.
3. **Milestones card: home AND Club tab** (the same shipped card twice).
4. **Progression invitation: restructured in-workshop (Paul's catch).**
   Milestone-based triggering was WRONG: milestones count nights, not
   groups - 9 jeffing nights plus 1 5k night crosses the 10 rung and
   would have aimed an 8k invitation at the wrong person. Replaced by
   group-count eligibility:
   - Eligibility = check-ins with a SPECIFIC group (live-era group_key),
     not ladder rungs. Threshold: 10+ with that group once live data
     matures; until then an interim proxy from total lifetime nights
     (seeds included), baselined by Paul from personal knowledge - a
     calibration, not a spec, like the per-day badge threshold.
   - TWO pathways: jeff -> 5k run and 5k -> 8k. Framed SIDEWAYS
     ("another group on the same night, here is how it actually works"),
     never as a ladder - jeffing is a destination, not a bottom rung.
     The About-the-groups page covers movement in every direction,
     including 8k regulars running 5k some weeks.
   - Leaders excluded (the cross-cutting rule above).
   - Moment: first app open after the qualifying check-in - anchored to
     the member's own attendance, in-app card only, never a push. Once
     ever; two dismissals ("maybe another week" / "don't show again");
     the groups page stays reachable forever.
5. **Structure facts: already mostly written.** The site About page
   carries the contract ("nobody gets left behind - we regroup at
   junctions and make sure everyone gets back together") and
   `lib/groups.ts` is the single source for per-group paces and
   descriptions. The invitation ADAPTS this content; regroup FREQUENCY
   is stated, never specific points. No new collection process needed.
6. **Launch without member quotes.** The facts plus the role-attributed
   back marker line carry the invitation; quotes join later if good ones
   surface naturally (photo_consent-grade consent when they do).
7. **Route familiarity: deferred** until autumn data exists. Not in the
   first build; the derivation is built later and the surface lights up
   without a layout change.
8. **Solo section: routes AND walks.** Build the tiny read-only walks
   API (walks data is site-bound in `lib/walks.ts`). No logging, no
   counting - solo stays a gift.
9. **Upcoming-run leader line: settled pre-workshop** (reaction record
   above). The standing role line; no names on weekly runs; C25K named
   cohort contact stays viable.
10. **Development ask: in, with the straw-man options** (get fitter /
    run further / a first race or parkrun / just enjoy Thursdays).
    Skippable, editable in profile, signposting only, "just enjoy
    Thursdays" produces no follow-up. Schema designed at build time.
11. **Collective stat: one quiet line under the hero.** "38 of us ran
    last Thursday." Always the most recent qualifying run (a cancelled
    week keeps showing the previous one - no zero states). Cohort
    variant in C25K season per the 6 Jul decision.
12. **Sequencing: shell-first.** The first build ships the surfaces
    whose data exists today: hero + role line, milestones card,
    collective stat, solo section. The preferred-group tile lights up as
    live check-ins accumulate; the invitations wait on thresholds plus
    the adapted copy; the development ask waits on its schema flag. Each
    surface lights up without a layout change.
13. **January reuse: confirmed.** The invitation component doubles as
    the C25K graduation bridge (graduation-triggered, swapped copy), and
    the C25K variant may carry the named cohort contact - the one place
    naming is logistically easy.

Next session: the interactive Pencil design session - the home in both
themes, iterated with Paul surface by surface on the shapes decided here,
never presented as a fait accompli. The build follows.

---

## Session prompt: runner home screen design (paste into a native-apps thread)

```
Design the personalised runner home for the RTR app in the Pencil file,
on the shapes decided at the 11 Jul 2026 workshop. This is screen design,
iterated INTERACTIVELY with Paul surface by surface - present each
surface for reaction before polishing the next; never a fait accompli.
The app build follows in a later session.

REPO RULE - READ BEFORE COMMITTING ANYTHING TO radcliffe-run
No em dashes in ANY file (CI guard) - plain hyphens. Staging-first:
commit to the working branch, push to staging only; Paul approves merges.

WHERE
The Pencil file at ~/Documents/"RTR app". Start with get_editor_state
(include_schema: true) and get_guidelines. The badge components (Badge
40/80/160) and the Ladder Card grammar already exist in the file - reuse
them, do not redesign.

READ FIRST
- radcliffe-run repo: docs/RUNNER_HOME_BRIEF.md - the straw-man home
  (surface by surface), Paul's reaction record, and the workshop decision
  record. The 13 decisions are FINAL - do not relitigate. Where straw man
  and decision record differ, the record wins.
- docs/RECOGNITION_DESIGN_BRIEF.md - badge grammar + Ladder Card anatomy
  (the home reuses the card); "My Ladder" is called Milestones on every
  member-facing surface.
- docs/PENCIL_DESIGN_BRIEF.md - the M1 file's conventions.
- docs/NATIVE_APP_SCOPE.md section 6 - tab structure (the Runs tab
  becomes the home; tab count unchanged).

WHAT TO DESIGN (both themes throughout)
1. The home screen, top to bottom per the decided shapes: greeting hero
   ("Evening, Kate.") + next run card (existing card grammar: date, time,
   meeting point, on-tour, cancelled) + group tiles (usual group large,
   others small, provenance line "your usual group, from your check-ins",
   one-tap correction) + the standing role line ("Every group has a
   leader at the front and the back") + collective stat line ("38 of us
   ran last Thursday") + Milestones card (the shipped Ladder Card, reused)
   + development ask card + solo section card (routes + walks).
2. Every slot in BOTH states - lit and unlit - because the build is
   shell-first and surfaces light up as data matures WITHOUT a layout
   change: cold-start tiles (all equal), tile with usual-group-large,
   development card asked/unasked, invitation present/absent.
3. The progression invitation card: structure facts first (adapted from
   the site About page + lib/groups.ts paces - regroup FREQUENCY, never
   points), then the norm line, then the role-attributed back marker
   voice ("one of our back markers: I run at the back on purpose - that
   is the job"). No member quotes at launch. Two dismissals: "Maybe
   another week" / "Don't show this again". Design BOTH pathway variants
   (jeff -> 5k run, 5k -> 8k) framed sideways - another group on the same
   night, never a ladder or a next step.
4. The About-the-groups page (drill-in, no tab bar): the permanent home
   of the invitation content, covering movement in EVERY direction
   including 8k regulars running 5k some weeks.
5. Full-screen states: signed-out / no member (generic runs list, quiet
   sign-in invite, nothing broken), brand-new member (cold start
   everywhere), established member (all lit), and LEADER (no invitation
   ever renders - is_run_leader members are opted out of behavioural
   interventions; check with Paul whether leaders want a different tile
   treatment - flagged at the workshop).

COPY DECISIONS TO SETTLE WITH PAUL IN-SESSION
- The tab label: does "Runs" stay or become "Home"?
- The greeting form and time-of-day variants.
- The exact role line and collective stat wording.
- The invitation copy drafts for both pathways (adapt, show, iterate).

REAL DATA FOR MOCKS
- Next run from the live runs table shape (date, title, meeting point,
  groups 8k / 5k / jeffing, on_tour, cancelled).
- Paul's member shape: 160/160 milestones, next 200. A mid-range member
  ~40 runs. A newcomer 0/0 with 1 check-in. Collective stat 38.
- Preferred group: 8k-usual, 5k-usual, jeff-usual, and no-majority (all
  tiles equal) variants.

OUTPUTS
- Home + invitation + groups-page frames in the Pencil file, both themes,
  all states above.
- Exported renders committed to radcliffe-run design/screens/ (hyphens
  in filenames and commit messages).
- Decisions taken with Paul appended to this brief (again: hyphens, not
  em dashes; staging only).
```

---

# Decision record (Pencil design session, 11 Jul 2026)

Session held in the Pencil file at ~/Documents/"RTR app", iterated with Paul
surface by surface on the workshop shapes. Frames (both themes): Home in
eight states - 8k usual / badge tapped / new member cold start / leader
160-160 / signed out / invitation 5k to 8k / invitation jeff to 5k / no
majority + development answered - plus the About the Groups drill-in.
Renders committed to design/screens/ (home-*.png, about-groups-*.png).
The canvas note "Note Runner Home" carries the same record beside the frames.

1. **Tab label: Runs becomes Home** (house icon). Applied on the new Home
   frames; the older M1 frames keep the historic label - they are
   superseded by these designs.
2. **Greeting: "Hi {firstName}"** - no time-of-day variants.
3. **Milestones on the home = the header badge** (evolved in-session from
   the workshop's card-on-home; the Club tab card is unchanged, so
   recognition still lives in both places). The badge replaces the
   radcliffe.run wordmark: badge-only, 40 px, binary per the grammar.
   Tapping it opens a popover over a scrim - next-up badge at 80 px with
   the progress arc, count ("40 runs"), "10 to next badge" + linear bar,
   and a View milestones link into the full screen; tap anywhere to
   dismiss. Leaders carry TWO coins (runs + hand-heart leading) and the
   popover gains a row per ladder. Cold start shows the locked 10-coin
   from day one - the header never reflows.
4. **Slot order**: greeting -> next-run hero (existing card grammar) ->
   collective stat -> THURSDAY'S GROUPS -> role line -> UPCOMING ->
   development ask -> solo card.
5. **Collective stat**: "38 of us ran last Thursday." - members-only
   (hidden signed out).
6. **Role line**: "Every group has a leader at the front and the back -
   nobody gets left behind."
7. **Group tiles**: usual group large with provenance "Your usual group,
   from your check-ins" and a one-tap Change; for leaders the provenance
   reads "Where you usually lead, from your check-ins" (same tile
   otherwise). Equal tiles for cold start AND no-majority. Paces are in
   km on every home surface (member preference roughly 60/40). BUILD
   ITEM: a Settings units toggle, km <-> mi.
8. **Invitation copy (both pathways)**: eyebrow ANOTHER GROUP, SAME NIGHT;
   titles "Fancy trying the 8k sometime?" / "Fancy trying the 5k run
   sometime?" ("sometime", not "some week"); the facts paragraphs share
   "There is a leader at the front and back, and usually in the middle
   too." and "The back leader is there to make sure nobody runs alone.";
   the norm line is SOFTENED to "You can pick a different group any week -
   same time, same place." (not "same market" - on-tour nights exist; the
   stronger descriptive norm "plenty run 8k some weeks and 5k others"
   returns only when live group_key data proves it). NO quote at launch -
   the role-attributed line felt fake; revisit if a real leader wording
   surfaces. Dismissals confirmed: "Maybe another week" / "Don't show
   this again".
9. **Development ask**: "What would you like from your running?" - Get
   fitter / Run further / A first race or parkrun / Just enjoy Thursdays,
   with a quiet "Not now". Answered state: YOUR RUNNING eyebrow + the
   answer + Edit, over signpost rows (the groups page, parkrun, the route
   library). "Just enjoy Thursdays" produces no signposts.
10. **Solo card**: "Fancy a solo run or walk this week?" + "We've lots of
    options for you." + Routes / Walks buttons. No logging, per scope.
11. **Signed-out home**: title falls back to radcliffe.run, no badge,
    equal tiles, no development ask, and a quiet "Are you a member?"
    sign-in card after the role line. Nothing renders broken.
12. **About the Groups drill-in**: intro says "usually from Radcliffe
    Market" (on-tour exists); three group cards adapted from
    lib/groups.ts; a MOVING BETWEEN GROUPS card covering movement in
    every direction (8k regulars dropping to 5k included); the
    back-leader line at the foot. This page is the permanent home of the
    invitation content - dismissing the card costs nothing.

Next session: the app build (shell-first per workshop decision 12 - hero,
role line, stat, solo and the header badge have their data today; tiles
and invitations light up as live check-ins accumulate).

---

## Session prompt: runner-home APIs (paste into a radcliffe-run site thread)

```
Build the runner-home APIs in the radcliffe-run repo (Next.js + Supabase),
ahead of the native app's home build. Backend-first rule: the app holds no
logic - these endpoints own every derivation. Read first:
docs/RUNNER_HOME_BRIEF.md (the workshop decision record AND the 11 Jul 2026
Pencil decision record - both FINAL, do not relitigate); the designed
screens are design/screens/home-*.png and about-groups-*.png.

REPO RULES
No em dashes in ANY file (CI guard) - plain hyphens. Staging-first: commit
to the working branch, push to staging only; Paul approves merges.

AUTH + TRANSPORT
Bearer-token auth per lib/apiAuth.ts, exactly as /api/attendance/summary.
Add each new app-facing path to APP_API_PATHS (lib/appCors.ts + its test) -
CORS exists ONLY for the browser-preview verification loop, auth is still
enforced per-route.

WHAT TO BUILD
1. GET /api/home - one member-authed aggregate for the personalised home
   (401 signed out, 404 signed-in with no member row; the app renders its
   signed-out/cold-start states off those):
   - firstName, isRunLeader
   - usualGroup: the majority group_key over the member's LIVE-era
     check-ins (group_key non-null; reliable 9 Jul 2026 onward). null
     until 3+ such check-ins AND a strict majority - null means the app
     renders equal tiles (cold start and no-majority are the same render).
     Leaders are INCLUDED (the tile is leader-inclusive; only behavioural
     interventions exclude them - the app shows leaders different
     provenance copy off isRunLeader). Include the per-group counts used,
     so provenance is auditable and the app never re-derives.
   - collectiveStat: { count, runDate } - distinct members checked in on
     the most recent qualifying run date (run_type IN ('regular','c25k'),
     not cancelled - the AGENTS.md counting invariant). A cancelled week
     keeps showing the previous run; no zero states. Members-only by
     Paul's decision (11 Jul) - it lives in this authed payload, never
     anon.
   - developmentPreference (see 3).
   - Do NOT duplicate the milestone summary here - the app already
     consumes GET /api/attendance/summary for the header badge + popover.
2. GET /api/walks - tiny read-only mirror of lib/walks.ts for the solo
   card's Walks button. Anon read is fine (walks are public site content).
3. Development preference (workshop decision 10 deferred the schema to
   build time - this is that moment): a single nullable enum column on the
   member row (get_fitter | run_further | first_race | enjoy_thursdays),
   written ONLY via PATCH /api/profile (alongside awards_public, same
   optimistic-update contract), served in GET /api/home. Skippable,
   editable forever, app-only for now (no email use).
4. NOT this session: invitation eligibility (waits on live group_key
   volume + thresholds Paul calibrates) and route familiarity (deferred
   to autumn, workshop decision 7). Both light up in the app without a
   layout change when their data exists.

VERIFY
Typecheck + tests + the em-dash guard. Probe endpoints against the dev
Supabase project with a minted member session (the .env.local service-role
generate_link -> verify pattern from the recognition build), including:
a member with 3+ live grouped check-ins (usualGroup set), a member with
mixed groups (null), a leader (isRunLeader true), signed-out 401, and the
cancelled-week stat fallback. Then production probes (401 signed out,
CORS preflight). Update docs/NATIVE_APP_SCOPE.md section 5's API list.

OUTPUT
Working endpoints on staging + a decision record appended to
docs/RUNNER_HOME_BRIEF.md (hyphens, staging only). The app build session
follows in native-apps - it consumes GET /api/home, /api/walks,
/api/attendance/summary and PATCH /api/profile, and adds the km <-> mi
units toggle in Settings (client-side, no API).
```
