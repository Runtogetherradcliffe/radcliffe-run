# C25K retention and engagement - evidence briefing

Status: research briefing for the native app gamification layer (drafted 6 Jul 2026).
Analysis only - no code changes accompany this document. Companion to
`docs/NATIVE_APP_SCOPE.md` (which keeps C25K and registration OUT of app v1; the
mechanics here are v1.1+ candidates, but the data model they depend on can and
should exist earlier - see section 6).

Audience: the user-story workshop with Paul (C25K programme lead). Format:
findings with sources and confidence levels, distilled design principles, a
straw-man award ladder to react to, and an explicit open-questions list.

Confidence key:
- **High** - peer-reviewed meta-analysis / replicated result
- **Medium** - single peer-reviewed study, or a robust result extrapolated to our context
- **Low / lore** - industry data, UX pattern literature, or company-reported metrics; plausible mechanism, weak methodology

---

## 0. Where we start: audit of the codebase and club

### The programme as built

- **Structure:** 10 weeks, three sessions per week - Tuesday group session (Aldi,
  Higher Lane, Whitefield), Thursday group session (Radcliffe Market), plus a
  solo weekend session. Members choose `tuesday`, `thursday` or `both` at
  registration (`members.c25k_session`), so a single-day member has ~10 group
  sessions available across the programme and a `both` member ~20.
- **The programme already softens the classic cliff:** week 5 is a designed
  consolidation week (repeat of week 4), and weeks 6-7 have configurable session
  order (`site_settings.c25k_session_order`). Week 10 is graduation at Heaton
  Park parkrun - the programme already ends by handing runners to an ongoing
  community event, which section 4 shows is exactly what the evidence prescribes.
- **Cohorts:** one active cohort at a time, modelled as `members.cohort = 'c25k'`
  plus a label/start date/cap in `site_settings`. There is no cohort history
  table and no graduation state - a member who finished the Spring cohort is
  indistinguishable from one starting the Summer one unless the flag is reset.
  Any multi-cohort award history needs this modelled properly.

### Attendance today: not recorded, anywhere

This is the load-bearing audit finding. There is **no attendance table, no
check-in UI, and no per-session record of any kind** in the schema (tables:
members, runs, site_settings, scheduled_emails, email_send_log, email_snippets,
route_descriptions, posts, push_subscriptions). The leader C25K roster
(`/leader/c25k`) is a read-only register of who signed up - session filter,
emergency contacts, medical flags. Nobody knows, in data, who actually turned up
to anything. Every award mechanic in this document is blocked on fixing that,
and RTR's own dropout curve is currently unmeasurable (the evidence in section 1
is from other populations because ours does not exist). The `runs` table already
supports `run_type = 'c25k'`, so sessions can exist as run records - a natural
foreign key for an attendance table.

### Registration as built

`/join` is a well-made multi-step form: step 1 about you (first name, last name,
email, mobile optional), step 2 emergency contact (name, phone, relationship),
step 3 health declaration + medical notes (optional) + age confirmation + GDPR
consents (data required; email, photo, medical optional), then a welcome screen.
The C25K variant adds a session picker. Roughly 8 required fields plus 3
required checkboxes. On submit the server INSERTs the member, **creates a
confirmed Supabase auth user immediately** (no password - sign-in is 8-digit
email OTP later), and sends a personalised Brevo welcome email; the C25K variant
links to the programme page. Duplicate registration fires an OTP and shows
"already registered". Existing members can quick-join C25K via `/c25k/join`.

So account creation is invisible and free at registration (good), the form is
already multi-step (good), and the welcome email already says "just turn up"
(good). What is missing is everything between the welcome email and week 10:
nothing marks attendance, nothing notices absence, nothing celebrates anything.

### Native app scope tensions to hold in mind

- C25K and registration are explicitly OUT of app v1; sign-in exists in v1 only
  for the leader area. Gamification is therefore v1.1+ surface work - but the
  capture mechanism (section 6) fits the v1 leader ring almost perfectly.
- Once member sign-in exists in the app, the account-deletion obligation and App
  Privacy declarations expand (scope doc sections 3-4). A capture model that
  does NOT require members to install the app or sign in keeps awards accruing
  for everyone while the app rolls out through its rings.

---

## 1. Where beginner runners actually drop out

### The headline peer-reviewed result

A 2023 UK study of a 9-week beginner programme ("Couch-to-5k or Couch to Ouch to
Couch!?", 110 participants, North West England) found:

- **27.3% completed.** 48.2% had dropped out by the week-5 midpoint, and **74.6%
  of all dropouts happened before halfway**.
- **Injury, not motivation, was the dominant stated cause.** 19% injury
  incidence; 73% of interviewed dropouts attributed quitting to injury; previous
  injury multiplied new-injury risk (OR 7.56).
- The **week-5 progression jump** (short intervals to ~20 minutes continuous)
  was singled out as troubling; the authors recommend gentler progression,
  strength/injury-prevention content, and support for re-engagement after injury.
- The sample skews the way RTR's likely does: 81.8% female, average age 47, and
  **43% had attempted the programme before** - beginner running is a repeated
  attempt behaviour, not a one-shot funnel.
- Dropouts reported "frustration, embarrassment, disappointment, guilt and
  devastation" - the emotional residue that makes returning hard.

Confidence: **Medium-high** (single study, self-selected sample, but directly on
point and consistent with the broader adherence literature).
Source: [PMC10487403](https://pmc.ncbi.nlm.nih.gov/articles/PMC10487403/)

Implications that cut against folklore:

- The famous "week 5 run 3" cliff is real but incomplete: **dropout is
  front-loaded across weeks 1-5**, not concentrated at one heroic run. Early
  weeks deserve as much retention design as the continuous-running jump.
- RTR's consolidation week 5 is a genuine evidence-aligned asset. The award
  system should never penalise repeating a week - repetition IS the programme
  working.
- Because attempts recur, **re-entry must be first-class**: "43% of your cohort
  has tried before" reframes restarting as normal, and guilt is the enemy.

### Gaps: illness, holidays, weather

- Systematic reviews of seasonality: physical activity is roughly **9% lower in
  winter**; ~73% of studies find significant weather effects; precipitation
  suppresses activity, daylight and temperature raise it. An evening outdoor
  programme in Greater Manchester should expect winter cohorts to bleed harder,
  and dark-nights drop-off is structural, not personal. Confidence: **High** for
  the effect existing; medium for magnitude in our context.
  Sources: [PMC8751121](https://pmc.ncbi.nlm.nih.gov/articles/PMC8751121/),
  [Tucker & Gilliland 2007](https://pubmed.ncbi.nlm.nih.gov/17920646/),
  [PMC7863471](https://pmc.ncbi.nlm.nih.gov/articles/PMC7863471/)
- **Fresh start effect:** aspirational behaviour spikes at temporal landmarks
  (new week, new month, post-birthday, post-holiday) - Dai, Milkman & Riis 2014,
  Management Science. Re-engagement messages should land ON a landmark ("your
  cohort restarts Tuesday - pick up at week 4, exactly where you left off")
  rather than mid-gap. Confidence: **High** for initiation at landmarks;
  **Medium** for the extrapolation to mid-programme re-entry.
- What re-engagement looks like at these moments, synthesised: name the specific
  session to return to (implementation intention, below), zero guilt framing,
  explicit "repeat a week" permission (the NHS programme's own advice), and a
  named human ("Sarah leads Tuesday - she knows you are coming back").

---

## 2. What demonstrably works for exercise adherence

- **Gamification does move the needle, modestly.** Meta-analysis of 16 RCTs
  (n=2,407): small-to-medium effect on physical activity (g=0.42, ~+1,610
  steps/day), with a small persisting effect (g=0.15) at 12-24 week follow-up -
  i.e. not pure novelty, but not magic. Confidence: **High**.
  Source: [Mazéas et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8767479/)
- **Attendance-contingent beats performance-contingent.** The classic incentive
  study (Charness & Gneezy 2009) paid people simply to attend the gym; attendance
  habits persisted after payment stopped, in previously non-exercising adults.
  Separately, the Cerasoli et al. 2014 meta-analysis (40 years of studies) finds
  intrinsic motivation is crowded out most when rewards are **directly
  performance-salient**, and least when tied loosely to participation. For a
  back-of-pack beginner cohort: award turning up, never pace, distance or
  "improvement". Confidence: **High**.
- **Milestone celebration and progress visibility** map onto the competence need
  in self-determination theory (section 4): visible, absolute progress ("week 6
  of 10", "session 8") supports competence without comparison. parkrun survey
  work explicitly identifies milestone recognition as a competence support.
  Confidence: **Medium-high** (mechanism well-established; specific mechanics
  less trialled).
- **Fresh starts** - see section 1; also usable proactively (cohort start dates
  are themselves temporal landmarks - January and September cohorts harvest the
  strongest fresh-start energy).
- **Implementation intentions** - specifying when-where-how ("if it is Tuesday
  7pm, I am at Aldi Higher Lane") reliably increases follow-through; the
  Gollwitzer & Sheeran 2006 meta-analysis finds a medium-to-large effect
  (d~0.65) across behaviours, and physical-activity-specific meta-analysis
  (Bélanger-Gravel et al. 2013) confirms a positive if smaller effect.
  RTR's registration already IS one (members pick a named session on a named
  weekday at a known place) - section 7 shows how to sharpen it. Confidence:
  **High** for the general effect (note: cited from the literature; the
  specific-paper fetch was not verified during this research pass).
- **Pre-commitment** - choosing a cohort with a start date and a capacity cap is
  a commitment device; scarcity ("12 places left") and a named start date both
  strengthen it. Gym-membership economics (DellaVigna & Malmendier 2006, "Paying
  Not to Go to the Gym": members predict 9 visits/month, make 4) is the cautionary
  tale - **commitment at sign-up systematically overestimates behaviour**, so
  the system must be designed for the gap, not offended by it. Confidence: **High**.

---

## 3. What backfires - and the antidote for each

| Mechanic | Evidence it backfires | Antidote for RTR |
|---|---|---|
| **Streaks** | Qualitative studies of digital-health tools: a broken streak demotivates *return* - the user feels the accumulated value is unrecoverable and quits entirely. Duolingo's own answer (streak freeze) reportedly cut churn ~21% - i.e. even the canonical streak company had to build forgiveness (lore, company-reported). For a population where missing a week for illness/holiday/childcare is NORMAL and where the programme itself prescribes repeating weeks, a streak is the wrong primitive entirely. | **Cumulative counts that only go up.** "Sessions attended: 7" survives any gap. If any continuity mechanic is wanted, make forgiveness bounded-but-generous and silent (Duolingo applies freezes without asking). Better: no streaks at all. |
| **Rewards crowding out intrinsic motivation** (overjustification) | Deci, Koestner & Ryan 1999 meta-analysis: expected, tangible, contingent rewards undermine intrinsic motivation; **verbal praise and unexpected recognition do not** - they enhance it. Cerasoli 2014 confirms the performance-salience gradient. Confidence: High. | Awards as **recognition, not payment**: symbolic (badge, certificate, milestone t-shirt), attendance-contingent, and ideally delivered by a human voice ("informational" not "controlling" in SDT terms). Never money/discounts for attendance. |
| **Leaderboards** | Classroom RCT-style study (Hanus & Fox 2015): a leaderboard+badges course produced LOWER intrinsic motivation, satisfaction and final performance than the control. Ranking is motivating for those near the top and demotivating for exactly the people C25K exists for. Our cohort is majority-female, older, self-conscious beginners - the study population most likely to be harmed by public comparison. Confidence: Medium-high. | **No comparative rankings, ever.** Progress is absolute (vs the programme) or collective (vs the cohort's shared total - "together you have run 240 km"), never member-vs-member. |
| **Public-by-default progress** | Embarrassment is a documented dropout emotion (section 1); photo consent already exists as a club-level precedent for "visible by choice". | **Private by default, celebrated by consent.** A member opts in to being named at the Tuesday session or in the newsletter, mirroring `photo_consent`. |
| **Notification volume** | Micro-randomised trials: notifications lift immediate engagement but show NO long-term retention gain, and irrelevant/frequent prompts drive opt-out and app abandonment. Confidence: High. Sources: [JMIR 2018](https://mhealth.jmir.org/2018/11/e10123/), [JMIR 2023](https://mhealth.jmir.org/2023/1/e38342) | **Few, event-anchored, high-value pushes**: night-before session reminder, milestone congratulation, cancellation alert. Per-type toggles (the scope doc's `push_tokens.prefs` already plans this). Nothing scheduled "for engagement". |

---

## 4. The social dimension - RTR's structural advantage

The evidence here is the strongest in this whole briefing, and it all points the
same way: **the club itself is the retention mechanic; the app's job is to
amplify it, not simulate it.**

- **Self-determination theory review** (Teixeira et al. 2012, 66 studies):
  autonomous motivation predicts sustained exercise; relatedness and competence
  satisfaction rise with persistence and feed intrinsic motivation. Confidence:
  **High**. Source: [PMC3441783](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3441783/)
- **Group cohesion meta-analysis** (Burke, Carron et al.): exercising in a
  "true group" (deliberately cohesion-fostered) beats a standard class, which
  beats home exercise, for adherence; team-building interventions raise
  attendance and return rates. Confidence: **High**.
- **The C25K-to-parkrun study** (3,296 C25K-motivated parkrunners): group
  support and social interaction are "crucial to physical activity adherence"
  after a beginner programme, and time-limited programmes should **establish an
  explicit link to an ongoing community event**. RTR already does this
  structurally (week 10 graduates at Heaton Park parkrun, Thursday club runs
  continue forever). 72.5% of C25K parkrunners were female. Confidence:
  **Medium-high**. Source: [PMC10548406](https://pmc.ncbi.nlm.nih.gov/articles/PMC10548406/)
- parkrun social-reward research: social factors predict enjoyment and
  subjective energy at events. Source: [PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0256546)

**Mechanics that amplify the real group** (build these):

- **Cohort visibility**: "9 of your cohort were at Tuesday's session" - social
  proof without ranking; absence framed as "we missed you", which only works
  because the people are real.
- **Leader recognition loop**: surface milestones TO the leader ("3 members hit
  5 sessions tonight") so a named human says it out loud at the session. Verbal,
  unexpected, relational recognition is precisely the reward type the
  overjustification literature says ENHANCES intrinsic motivation. This single
  mechanic converts the app from reward-dispenser to prompt-for-humans.
- **Graduation ritual**: already exists (parkrun week 10); formalise it -
  certificate, cohort photo (consent-aware), newsletter feature, and an explicit
  "what next" (join Thursday runs, jeffing group) so graduation is a bridge, not
  an exit.
- **Welcome from a human**: a message from the named cohort leader at
  registration (see section 7) - relatedness starts before session 1.

**Mechanics that substitute for the group** (avoid): in-app chat, AI
cheerleading, virtual running buddies, audio coaches. The NHS app needs Laura in
your ear because there is nobody else there; on Tuesday nights RTR has actual
humans. Substitution mechanics compete with the club's one unfair advantage.

---

## 5. What comparable products teach

- **parkrun** - the canonical attendance-award ladder (10 for juniors, 25, 50,
  100, 250, 500; free milestone t-shirts). Everything about it is
  evidence-aligned: **attendance-only** (walking, jogging, volunteering all
  count), **cumulative forever** (no decay, no streaks - miss a year, your count
  waits), celebrated **in community** (milestone shout-outs at the start
  briefing). What does NOT transfer: the scale. 25 events is ~6 months of
  weekly attendance; a 10-week programme whose single-day members have ~10
  sessions needs rungs an order of magnitude smaller. parkrun's ladder is the
  right shape for RTR's *post-graduation lifetime* count, not for the programme
  itself. Source: [parkrun milestone clubs](https://www.parkrun.com/about/join-us/milestone-clubs/)
- **Strava** - segments, leaderboards, PRs: performance-contingent and
  comparative, the two properties sections 2-3 identify as wrong for this
  population. What transfers: kudos (lightweight peer recognition, non-ranked)
  and private year-in-review progress visibility. The scope doc's judgement
  stands: RTR is not a tracking app; Strava owns that.
- **NHS Couch to 5K app** - per-session completion marking with weekly
  celebration, explicit permission to repeat weeks, coach audio as relatedness
  proxy. The tick-per-session and repeat-a-week framing transfer directly; the
  audio coach is what RTR's human leaders replace.
- **Duolingo** - the masterclass in both directions. Streaks drive daily
  engagement (7-day streak users reportedly 2.4x more likely to return next
  day - company data, selection-confounded, lore) but required TWO forgiveness
  systems (streak freeze, earn-back) to stop streak-loss churn. Its transferable
  ideas are the forgiveness architecture and milestone celebration moments, plus
  lesson-before-signup onboarding (section 7). Its non-transferable core is
  daily-cadence digital engagement: RTR's atomic unit is a twice-weekly physical
  gathering of ~30-40 people.
- **Cargo-cult warning list**: points/XP economies, levels, leagues, daily
  streaks, competitive challenges - all designed for daily digital products at
  scale, all either meaningless or harmful at club scale on a weekly cadence.

---

## 6. Frictionless attendance capture

The award system is exactly as good as this layer. Options surveyed:

| Pattern | Member friction | Accuracy | Cost / risk |
|---|---|---|---|
| **Leader one-tap register** (roster checklist, tap present) | Zero | High (leader verifies by sight) | ~20 taps per session for the leader; needs offline queueing (Aldi car park signal); needs a "who registers if the leader forgets" answer |
| **Member QR self check-in** (poster at meeting point) | Phone out, signed-in session required | Medium (gameable, forgettable) | OTP sign-in is the killer - members are rarely signed in; a queue of beginners doing email OTP in the rain is the opposite of frictionless |
| **Geofence auto check-in** | Zero (after setup) | Medium (false positives - living near Radcliffe Market) | Highest build cost; always-on location optics directly conflict with the scope doc's local-only location stance; App Privacy label impact |
| **Member self-report after the fact** ("I was there") | Low, async | Low-medium (drift, memory) | Cheap; needs verification story |
| **parkrun-style barcode scan** | Bring a barcode | High | Kit + volunteer role; overkill for 15-30 attendees |

**Recommendation: leader one-tap register as the system of record**, with
member self-report as an optional backfill that the leader tap confirms. Reasons:

1. It is the only zero-member-friction option, and the member is the person we
   are trying not to burden.
2. It fits the app rollout exactly: leaders are the app's first users (scope doc
   M3/M5), already authenticated, already holding a roster page. A native
   checklist against the C25K roster, cached offline, syncing when signal
   returns, is a small screen in the ring where iteration is free.
3. It keeps members out of the auth surface entirely - awards accrue for people
   who never install the app, and surface on the web profile. No new consent or
   App Privacy burden for members.
4. The same table works for Thursday club runs later (`runs.run_type` already
   distinguishes them), which is where the post-graduation ladder lives.

Proposed schema (workshop input - NOT applied to any environment, and per repo
convention it would go to production Supabase before any code that uses it):

```sql
CREATE TABLE attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by  uuid REFERENCES members(id) ON DELETE SET NULL,  -- the leader who tapped
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL DEFAULT 'leader',  -- 'leader' | 'self_report' (backfill path, leader-confirmed)
  UNIQUE (run_id, member_id)   -- one record per member per session; re-tap is idempotent
);

CREATE INDEX attendance_member_idx ON attendance(member_id);  -- milestone counts
CREATE INDEX attendance_run_idx    ON attendance(run_id);     -- session registers

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies: service-role only, per the AGENTS.md admin-table
-- rule (leader identity is is_run_leader checked server-side, not a Postgres
-- role, so RLS cannot express "leaders only"). All writes go through a
-- leader-gated API route (mirroring /api/leader/* patterns); a member reading
-- their own count goes through an API route or a narrow self-read policy
-- using (SELECT auth.email()) = email via a join - decide at build time.
```

Design notes baked into the shape:

- `member_id ... ON DELETE CASCADE` keeps the GDPR cleanup cron working
  unchanged - deleting a member erases their attendance trail.
- `recorded_by ... ON DELETE SET NULL` preserves the attendance record if the
  recording leader is ever deleted.
- Sessions are `runs` rows (`run_type = 'c25k'`), so Thursday club runs get the
  same mechanism for free when Ladder B starts (question 2 below), and
  `UNIQUE (run_id, member_id)` makes the leader's one-tap idempotent - a double
  tap or an offline-queue replay cannot double-count.
- `source` keeps leader-verified and self-reported rows distinguishable so the
  verification story (section 6 table) stays honest in the data.
- Milestone counts are then one query:
  `SELECT count(*) FROM attendance WHERE member_id = $1` (optionally joined to
  `runs.run_type` to split Ladder A from Ladder B).

C25K sessions become `runs` rows (run_type='c25k'), which the sync/admin
tooling already half-supports.

**Prior art in this repo:** a concept mockup of exactly this flow was built for
leader feedback in May 2026 - see
[`docs/mockups/rtr-checkin-mockup.html`](mockups/rtr-checkin-mockup.html)
(leader one-tap check-in with live counter, group selection with wrong-group
correction, "not on this list?" walk-up handling, check-in-another-runner, plus
a member "book your place" option). It is the starting wireframe for the autumn
build. The booking half is NOT being taken forward - see the workshop decisions.

**Measure before mechanising:** the first cohort with attendance data tells us
where RTR's actual dropout curve is (section 1 is other people's populations).
The attendance table is worth shipping a full season before any badge exists.

---

## 7. Registration and onboarding - the funnel entry

### Assessment of the current flow

The current form is close to right. Multi-step layout matches the evidence
(multi-step forms outperform long single pages; field-count studies - industry
grade, direction robust, magnitudes unreliable - say each removable field helps:
[CXL's review](https://cxl.com/blog/reduce-form-fields/) is the honest summary:
cutting fields usually helps but motivated users tolerate justified fields).
Every required field is defensible: emergency contact and health declaration are
genuine safety requirements for a running group, and members plausibly know it.
Account creation is already invisible (server-side, no password) - effectively
the "lazy registration" ideal at the account layer.

What could defer to later (workshop material, not a recommendation to change
now): photo consent, medical notes, mobile number (already optional). The
tempting big cut - deferring emergency contact to "before session 1" - creates a
second drop-off point and a session-1 safety gap if they never complete it. The
evidence-honest position: **the form is not the problem; the silence after it is.**

### The registration-to-session-1 cliff

This is a different cliff from mid-programme dropout and currently invisible
(no attendance data - section 0). The intention-behaviour gap is enormous and
systematic (gym members predict 9 visits/month, make 4 - DellaVigna &
Malmendier). Assume a meaningful fraction of registrants never attend session 1,
and design for it:

- **Onboarding as first win.** Frame registration completion as the first step
  of the programme, not paperwork: "That was session zero - you have already
  started." The endowed-progress effect (Nunes & Dreze 2006: a loyalty card
  pre-stamped 2/12 beats an empty 0/10) says visible head-start progress
  increases completion; the C25K welcome screen and email can show the
  programme bar already begun. Confidence: **High** for the effect; medium for
  this application.
- **Promise something back.** A welcome message from the *named* cohort leader
  ("I am Sarah, I lead your Tuesday group - see you at Aldi at 7") is what the
  relatedness evidence (section 4) predicts matters most at this moment. It
  converts an anonymous sign-up into a social commitment to a person.
- **Sharpen the implementation intention.** The session picker already captures
  when-and-where; add the concrete first date ("Your first session: Tuesday 9
  September, 7pm, Aldi Higher Lane"), an add-to-calendar link, and a
  what-to-expect note that pre-empts the embarrassment barrier ("nobody is left
  behind, walkers welcome, wear whatever").
- **Night-before nudge** for session 1 specifically (one push/email, not a
  campaign) - the single most defensible notification in the whole system.

### Deferred registration and the native app

The lazy-registration pattern (experience value first, register when there is
something to save - Duolingo's lesson-before-signup;
[pattern reference](https://ui-patterns.com/patterns/LazyRegistration)) is
already embodied in the app scope: v1 is fully usable with no account. The
tension to flag: if the gamification layer ever requires members to sign in on
the app to SEE their progress, the app's auth surface, account-deletion screen
and App Privacy label all grow (scope doc sections 3-4). The leader-capture
model (section 6) means awards accrue with no member app or sign-in; the web
profile (existing OTP auth) can display them. Member-facing in-app progress
becomes a pull factor for app adoption later, not a prerequisite - the right
dependency direction.

---

## Design principles for RTR (the distillation)

1. **Award attendance, never performance.** No pace, no distance, no
   improvement metrics. (High confidence: sections 2, 3.)
2. **Counts only go up.** Cumulative sessions attended; no streaks, no decay,
   no expiry. A six-month gap changes nothing about what you have earned.
3. **Missing a week is normal, so build for return.** Welcome-back framing,
   repeat-a-week permission, re-entry messages timed to fresh-start landmarks
   naming the specific session to return to.
4. **Private by default, celebrated by consent.** An opt-in celebration flag
   mirroring `photo_consent`. Nothing member-identifying is public without it.
5. **No member-vs-member comparison, ever.** Progress is absolute (vs the
   programme) or collective (cohort totals).
6. **Route recognition through humans.** Tell the leader who hit a milestone
   tonight; the badge is the prompt, the person is the reward.
7. **Amplify Tuesday night, never simulate it.** No chat, no AI coach, no
   virtual buddies.
8. **Registration is session zero.** Endowed progress + a named leader's
   welcome + a concrete first-session implementation intention.
9. **Capture must cost members nothing.** Leader one-tap register is the system
   of record; members need no app, no sign-in, no barcode.
10. **Notifications are rare and event-anchored.** Reminder, cancellation,
    congratulation. Per-type toggles. Nothing exists "to drive engagement".
11. **Measure before mechanising.** Ship the attendance table a season before
    the first badge; let RTR's real dropout curve set the milestone rungs.

---

## Straw-man award ladder (to react to, not decided)

The arithmetic constraint the workshop must resolve first: a Tuesday-only member
has ~10 possible group sessions; a `both` member ~20. Paul's sketch (bronze 5,
silver 10) makes silver require **perfect attendance** for single-day members -
which violates the forgiveness principle for exactly the majority track.
parkrun-style 10/25/50 does not fit inside the programme at all; it fits what
comes after. Hence a two-ladder straw man:

**Ladder A - within the programme** (attendance-contingent, forgiving, capstone
is an event not a count):

| Award | Trigger | Notes |
|---|---|---|
| First Step | Registration completed | Session zero; endowed progress |
| Off the Couch | Session 1 attended | The cliff nobody measures today |
| Bronze | 4 sessions | Reachable by week 4-5 either track - lands support right where the dropout evidence says weeks 1-5 need it |
| Silver | 8 sessions | ~80% attendance single-day track; comfortably mid-programme for `both` |
| Graduate | Week 10 parkrun attended | Event-based capstone, already ritualised; certificate + cohort photo (consent-aware) |

**Ladder B - lifetime RTR attendance** (starts counting at C25K session 1,
continues through Thursday club runs forever - this is where parkrun's shape
belongs and where C25K-to-club-runner conversion is won):

| Award | Trigger |
|---|---|
| 10 | 10 sessions/runs attended |
| 25 | 25 |
| 50 | 50 |
| 100 | 100 (t-shirt territory) |

Deliberate properties: no rung requires perfect attendance; graduation is not a
count (an injured member who attends 6 sessions and walks the graduation parkrun
graduates); Ladder B makes the programme the first ten rungs of club life rather
than a product with an endpoint.

---

## Workshop decisions (6 Jul 2026)

The workshop was held with Paul on 6 Jul 2026; the open-questions list below is
retained for the record, with outcomes here. Context set at the workshop: the
next C25K cohort starts **January 2027**, so there is no build urgency - but
the check-in process should be live and proven well before the cohort arrives.

**Attendance capture**
- Leader one-tap register is the system of record. Any `is_run_leader` member
  can record any session (`recorded_by` tracks who); the unique constraint
  handles double entry.
- **Pilot on Thursday club runs in autumn 2026** (build Sep-Oct, pilot
  Oct-Dec). Leaders form the habit and offline sync gets tested before it
  matters; C25K inherits a proven process in January. Lifetime (Ladder B)
  counting starts at the pilot.
- Solo weekend C25K sessions COUNT, via member self-report
  (`source = 'self_report'`). Implication: this is the one decision that
  creates a member-facing flow (OTP sign-in required), and solo sessions need
  run records to attach to - likely auto-generated per cohort week.

**Award design (supersedes the straw-man Ladder A above)**
- One **combined programme ladder** counting all sessions (Tue + Thu + solo):
  First Step (registration) - Off the Couch (session 1) - **4 / 8 / 12 / 16
  sessions** - Graduate (week-10 parkrun, event-based, not a count).
- Plus single **per-day badges**: "Tuesday Regular" / "Thursday Regular"
  (threshold ~7 of 10 group sessions, group-verified only) - day-level
  recognition without three ladders to explain.
- **Ladder B adopted as proposed** (10/25/50/100 lifetime sessions, C25K and
  club runs alike), counting from the autumn pilot.
- Awards are digital on the rungs; **physical at Graduate** (printed
  certificate + consent-aware cohort photo at the parkrun).
- **Private by default, opt-in public** celebration, via a consent flag in the
  photo_consent mould.
- **Cohort collective totals** shown (programme page + cohort emails);
  comparison-free by construction.

**Graduation**
- Structured handover: certificate + photo at week 10, an explicit "your first
  Thursday club run is <date>" invitation (implementation intention), the
  lifetime ladder continuing seamlessly, and a follow-up email on the Monday
  after (fresh-start landmark).

**Registration and onboarding**
- Form stays as-is; effort goes into what follows submit.
- Welcome email gains a **named-leader section, written once per cohort by
  that leader** (semi-automated relatedness at zero marginal effort).
- **Night-before nudge for session 1** (email first, push when the app is
  there), and the registration-to-session-1 conversion is instrumented from
  the first captured cohort.

**Platform and timeline (the big one)**
- **The native app must be in place before the programme starts (January
  2027)** - member progress is seen in the app, not web-first. This pulls the
  app roadmap forward and amends the scope doc's v1 cut: either v1 ships early
  enough in autumn 2026 that the v1.1 member features (progress display, solo
  self-report, session nudge push) land by December, or those features fold
  into v1. Gate 0 (proving the TestFlight pipeline on the Abingdon app) is now
  time-sensitive. Sequence implied: site-side capture + schema (Sep-Oct, the
  web leader register works on phones regardless), Thursday pilot (Oct-Dec)
  overlapping the app's leader ring, member-facing app features by December.

**Check-in, not booking (added 6 Jul 2026)**
- The May 2026 concept mockup
  ([`docs/mockups/rtr-checkin-mockup.html`](mockups/rtr-checkin-mockup.html))
  explored two options: leader check-in and member per-session booking. Decision:
  **check-in only - no per-session booking for club runs**. Thursday runs have
  no capacity constraint, the club ethos is "just turn up", and attendance
  recording is retrospective, not access control. The only booking-shaped thing
  anywhere is C25K cohort registration itself (capacity-capped at sign-up),
  which already exists. The mockup's check-in flow (one-tap, group selection
  with correction, walk-up handling) is the starting wireframe for the autumn
  build; its booking flow is dropped.

**Still open (small)**
- Retroactive credit: recommendation is counts start at first captured session
  (no memory backfill) - not explicitly decided.
- Cohort history modelling (`members.cohort` is single-valued; multi-cohort
  award history and graduate identity need a `cohorts` table + join) - build
  detail, needed before January.
- Per-day badge threshold (the ~7 of 10) - tune when real data exists.
- Whether the Thursday-pilot register also surfaces "we missed you" style
  re-engagement for club regulars, or that waits for the C25K cohort.

---

## Open questions for the user-story workshop with Paul (as tabled - see decisions above)

**Attendance capture (decides everything else)**
1. Leader one-tap register as system of record - agreed? Who taps when the
   leader is mid-incident or absent? Can any leader-flagged member do it?
2. Do Thursday club runs get the same capture from day 1 (enables Ladder B), or
   C25K-only first?
3. Does the solo weekend session count for anything (self-report only), or do
   awards count group sessions only? (Straw man: group only - verifiable, and
   the group is the point.)
4. Retroactive credit: does the current/most recent cohort get counted from
   memory, or does the ladder start with the first captured cohort?

**Award design**
5. React to Ladders A and B; where do the rungs actually sit once the first
   season of real attendance data exists?
6. `both` members reach rungs faster than single-day members - acceptable
   (more sessions IS more showing up) or should rungs scale per track?
7. What is celebrated publicly vs privately - and is the consent flag per-member
   (like photo_consent) or per-milestone?
8. Physical vs digital awards: parkrun's t-shirts are physical; is Graduate a
   printed certificate at the parkrun? Budget?
9. Cohort vs individual framing: do we show cohort collective totals ("together:
   240 km"), and does the cohort survive graduation as a visible group?

**After graduation**
10. What exactly happens at week 10 - the conversion moment from C25K member to
    club regular. Who follows up, with what, on which landmark date?
11. Does `members.cohort` get a proper cohort/history model so graduates keep
    their C25K identity while joining the club mainstream? (Schema work either way.)

**Registration and onboarding**
12. Minimum viable first form: keep as-is, or defer photo consent/medical notes
    to a later touchpoint? (Straw man: keep as-is; fix the silence after, not
    the form.)
13. Should registration promise something back - specifically a welcome message
    from the named cohort leader? Who writes it, is it automated per cohort, and
    does the leader know who registered?
14. Session-1 night-before nudge: email, push, or both? One-off or for the first
    two weeks?
15. Do we instrument the registration-to-session-1 conversion from the first
    captured cohort (it is currently invisible)?
16. Where do members SEE their progress first - web profile (existing OTP auth,
    no app dependency) with the app surface following at v1.1+? Any tension with
    the app's no-login-wall stance to preserve?

---

## Source list

Peer-reviewed:
- [Couch-to-5k or Couch to Ouch to Couch!? (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10487403/) - beginner programme completion/injury/dropout
- [C25K to parkrun maintenance study](https://pmc.ncbi.nlm.nih.gov/articles/PMC10548406/)
- [Mazéas et al. 2022, gamification RCT meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC8767479/)
- [Teixeira et al. 2012, SDT and exercise systematic review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3441783/)
- Burke & Carron, group vs individual PA interventions meta-analysis ([Semantic Scholar](https://www.semanticscholar.org/paper/a60d9f8de8d41ad85b7c07089680b09fa0bd9d6b)); [Spink & Carron 1994](https://journals.sagepub.com/doi/10.1177/1046496494251003)
- [Social reward and support effects, parkrun (PLOS One)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0256546)
- Dai, Milkman & Riis 2014, "The fresh start effect", Management Science 60(10)
- Charness & Gneezy 2009, "Incentives to Exercise", Econometrica
- Deci, Koestner & Ryan 1999 (Psych Bulletin); Cerasoli, Nicklin & Ford 2014 (Psych Bulletin) - rewards and intrinsic motivation meta-analyses
- Hanus & Fox 2015, gamification/leaderboards classroom study, Computers & Education (cited from literature; not re-verified this pass)
- Gollwitzer & Sheeran 2006; Bélanger-Gravel et al. 2013 - implementation intentions meta-analyses (cited from literature; not re-verified this pass)
- [DellaVigna & Malmendier 2006, "Paying Not to Go to the Gym"](https://eml.berkeley.edu/~ulrike/Papers/gym.pdf)
- Nunes & Dreze 2006, endowed progress effect, Journal of Consumer Research
- Seasonality: [PMC8751121](https://pmc.ncbi.nlm.nih.gov/articles/PMC8751121/), [Tucker & Gilliland 2007](https://pubmed.ncbi.nlm.nih.gov/17920646/), [PMC7863471](https://pmc.ncbi.nlm.nih.gov/articles/PMC7863471/)
- Notifications: [Bidargaddi et al. 2018, JMIR](https://mhealth.jmir.org/2018/11/e10123/), [JMIR 2023 micro-randomized trial](https://mhealth.jmir.org/2023/1/e38342)

Industry / lore (flagged as such in text):
- [parkrun milestone clubs](https://www.parkrun.com/about/join-us/milestone-clubs/), [parkrun "Why milestones?"](https://blog.parkrun.com/uk/2022/08/24/why-milestones/)
- Duolingo streak mechanics and streak-freeze churn claims: [Deconstructor of Fun teardown](https://duolingo.deconstructoroffun.com/mechanics/streaks), [gamification misuse case study (arXiv)](https://arxiv.org/pdf/2203.16175)
- Form length: [CXL review of field-reduction studies](https://cxl.com/blog/reduce-form-fields/), [Venture Harbour](https://ventureharbour.com/how-form-length-impacts-conversion-rates/)
- [Lazy registration pattern](https://ui-patterns.com/patterns/LazyRegistration), [Appcues on gradual engagement](https://www.appcues.com/blog/gradual-engagement-mobile-app-first-screen)
- Check-in tooling survey: [OneTap](https://www.onetapcheckin.com/), [Urban Sports Club geofenced QR check-in](https://partnernewsroom.urbansportsclub.com/en/two-new-app-updates/)
