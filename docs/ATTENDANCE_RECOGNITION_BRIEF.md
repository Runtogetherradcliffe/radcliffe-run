# Attendance recognition - initiating brief

**What this is.** A self-contained prompt to start the session that builds the
attendance-counting and milestone-recognition backend. Paste the block below
into a new session in this repo. Written 10 Jul 2026, after leader check-in went
live on Thu 9 Jul; all "verified" facts were checked against the live production
database that day and should be re-verified, not trusted blindly.

**Why now.** Paul is checking runners in every Thursday so the backfill window
stops growing. The counting/recognition layer does not exist yet, and the data
it will read is accumulating now.

---

```
Build the attendance-counting and milestone-recognition backend for radcliffe.run.

GOAL
Recognise regular runners, parkrun-style. Members accumulate lifetime attendance;
crossing a rung (10/25/50/100) is recognised. Run leaders are recognised too, in
the way parkrun recognises volunteers. Nothing exists for any of this today.

READ FIRST (do not skip; the design is already decided in places)
- docs/C25K_ENGAGEMENT_RESEARCH.md - especially "Workshop decisions (6 Jul 2026)"
  and the two award ladders. Ladder B (10/25/50/100 lifetime, C25K + club runs
  alike) is ADOPTED. Awards are private by default, opt-in public. There is a
  "leader recognition loop" (surface milestones to the leader).
- docs/NATIVE_APP_SCOPE.md section 8 (settled decisions) - backfill is decided YES.
- app/api/leader/{register,checkin,contacts}/route.ts - the only code that touches
  `attendance` today. Nothing aggregates or counts anything, anywhere.

VERIFIED CURRENT STATE (checked against the live prod DB, project
`Live_radcliffe.run` / qpdymxagloeghypntpct, 10 Jul 2026 - re-verify, don't trust
this blindly)
- `attendance` exists and works: (run_id, member_id, recorded_by, recorded_at,
  source, group_key), UNIQUE(run_id, member_id) so writes are idempotent.
- Leader check-in went live Thu 9 Jul 2026: 14 rows, all group-tagged
  (8k=8, 5k=4, jeff=2), source='leader'.
- 102 active members, 14 run leaders. 99 run rows total, 21 of them in the past,
  earliest dated 2026-05-04.
- `runs.leader_name` exists but is EMPTY on all 99 rows. There is no record
  anywhere of who led which run.
- `attendance.recorded_by` means "who tapped the screen", NOT "who led the run".
  Do not use it as a proxy for leadership.
- No counts, no milestones, no aggregation code exists.

A NIGHT IS NOT A RUN ROW, AND A RUN ROW IS NOT A GROUP
(structural; get this right before writing any count or any leader relation)
- A Thursday has THREE groups in the real world: 8k run, 5k run, 5k Jeffing.
  Each has its own leader.
- But it is only TWO `runs` rows. Verified for 2026-07-09:
    5k row, "Out and back along the canal", has_jeffing=true  -> 14 attendance rows
    8k row, "Along the canal and around Elton", has_jeffing=false ->  0 attendance rows
  Jeffing has NO row of its own; it rides the 5k row's `has_jeffing` flag.
  Some dates differ again (2026-06-20 is a single 19.9k row) - never assume shape.
- The app anchors the whole night's register to ONE run row (the shortest-first
  id) and expresses the group solely via `attendance.group_key` (8k / 5k / jeff).
- Consequences, all load-bearing:
  * `run_id` CANNOT identify a group. It cannot distinguish 5k from Jeffing (no
    row exists), and 8k attendance is recorded against the 5k row regardless.
    `group_key` is the ONLY faithful record of which group a member did.
  * Joining attendance -> runs yields the WRONG route/title for 8k runners (they
    hang off the 5k row). This is the same anchoring that made the app's check-in
    header show the 5k route to the 8k group - a real bug, fixed app-side by
    removing the title. Do not reintroduce it server-side.
  * The unit of the lifetime ladder is A NIGHT ATTENDED, not a run row.
  * `UNIQUE(run_id, member_id)` does NOT prevent one member being recorded twice
    for one night (once per run row). Live check-in never does this, but a
    backfill importer keying 8k runners to the 8k row and 5k runners to the 5k
    row WOULD - quietly breaking the "one row per person per night" invariant
    the live path relies on.
  * Therefore: COUNT DISTINCT RUN DATES, not attendance rows. And make the
    importer follow the live anchor convention (anchor run_id + group_key), not
    the intuitive per-group-row keying.
  * If "which route did this member actually run" is ever wanted, it must be
    derived group_key -> that night's run row for that group (with jeff falling
    back to the 5k row). It is not recoverable from attendance.run_id.

THE BACKFILL IS THREE ERAS (this resolves the "run+attendance rows vs per-member
seed offset" question the research doc left open - it is BOTH)
1. Pre-4 May 2026 (old site): Paul can run a report giving a PER-MEMBER TOTAL
   only. No dates, no runs, and no run rows exist to attach to. -> a seed offset.
2. 4 May – 9 Jul 2026: run rows already exist; Paul is reconstructing attendance
   from the run photos on the site. -> real `attendance` rows, distinct `source`.
3. 9 Jul 2026 onward: live leader check-in. Already landing.
Lifetime count = seed + count(attendance rows). Milestones crossed inside era 1
cannot be dated - decide explicitly how to present those ("already achieved").

BLOCKING, UNRESOLVED: HOW DO WE MODEL A NIGHT AND ITS GROUPS?
Paul and Claude agreed (10 Jul 2026) this needs a thorough discussion and is NOT
to be settled in passing. Resolve it BEFORE the backfill, because the import will
harden around whatever shape is chosen and rewriting it later means rewriting
history rows.

The tension: the ladder's unit is "a night attended", but NO NIGHT ENTITY EXISTS.
A night is emergent - a date, plus a convention that the register anchors to the
shortest-first run row. The concept is reconstructed independently in three
places (the app's `mergeRuns`, the check-in anchor, and implicitly in
`attendance`) and lives in the schema in none of them. That is the classic
signature of a missing entity. Likewise Jeffing is a real group with a real
leader, and it exists in the schema only as a boolean on another group's row.

Options to weigh (none pre-selected):
A. Give Jeffing its own `runs` row. Model matches "3 groups"; leadership could
   key on run_id. BUT Jeffing runs the SAME 5k route at the same time - it is a
   method, not a separate run - so this duplicates route/time/meeting point,
   adds a third card to the public runs feed, and disturbs `mergeRuns` and the
   shortest-first anchor the live check-in depends on.
B. Leave `runs` alone; make the GROUP a first-class dimension (as `attendance`
   already does via `group_key`), and key leadership the same way. Cheapest, no
   app breakage, models Jeffing correctly as a method on the 5k route. BUT
   `runs` stays odd (2 rows, 3 groups) and the anchor stays an implicit,
   fragile convention.
C. Make the NIGHT first-class (a `sessions` / `run_nights` entity) with groups as
   children; attendance and leadership hang off (night, group); routes attach per
   group. Cleanest - it turns the ladder's actual unit into a real entity and
   deletes the anchor hack, and the 2026-06-20 single-19.9k oddity fits naturally.
   BUT it is the largest migration and touches the runs feed, `mergeRuns`, and the
   check-in anchor.

Whatever is chosen, `group_key` (8k / 5k / jeff) must survive as the faithful
record of which group a member ran, and "one credit per member per night" must be
an enforceable invariant rather than a convention.

LEADER RECOGNITION (direction set by Paul; details open)
Adopt the parkrun shape: leading is recognised alongside running. But note the
DISANALOGY, and decide with it in view: a parkrun volunteer usually does NOT run
that day, which is exactly why parkrun keeps two separate counts. An RTR run
leader RUNS the run they lead. So leading plausibly earns BOTH an attendance
credit and a leader credit - that is a decision, not an assumption.
- Leaders have never been checked in, historically or on 9 Jul (verified: no row
  where member_id = recorded_by). Going forward they can simply check themselves
  in like anyone else - decide whether to prompt/require that.
- Leader credit needs its OWN explicit record (a "led by" relation), because
  `runs.leader_name` is empty and free-text, and `recorded_by` is the wrong thing.
- It is MANY-TO-MANY: a night has THREE leaders, one per group (8k, 5k, Jeffing).
  It MUST carry `group_key`. Keying leadership on run_id alone is impossible -
  there is no Jeffing run row, so the 5k and Jeffing leaders would collapse onto
  the same row and become indistinguishable. Key it exactly as attendance is
  keyed: anchor run_id + group_key (see "a night is not a run row" above).
- Paul can reconstruct leader history back to roughly the start of 2026. Run rows
  only exist from 4 May 2026, so leader credit hits the SAME three-era problem:
  a seed offset for Jan–May, real rows thereafter.

SOURCES FOR LEADER HISTORY, AND THEIR CONFIDENCE (Paul has three)
- Leader AVAILABILITY POLLS. These record stated availability - an INTENT to be
  a candidate - not the act of leading. High recall, lower precision: someone
  available may not have led; a last-minute cover may never appear on the poll.
  Use as a candidate set, never as the record itself.
- RUN PHOTOS. Evidence of PRESENCE, but a photo cannot show who was leading.
  Good for attendance, weak for leadership on its own.
- PAUL'S RECALL. Ground truth, but expensive and decays.
Neither poll nor photo alone establishes "who led": the poll narrows the
candidates, the photo confirms the candidate was there, Paul adjudicates. Where
poll and photo agree, confidence is high; where only the poll fires, the row is
provisional.
=> Record PROVENANCE and CONFIDENCE on every backfilled row (source in
{poll, photo, recalled, live}, plus a provisional flag). This is recognition:
awarding a milestone to the wrong person is socially awkward to retract, so the
data must be auditable and correctable long after the import.

PRACTICAL: Paul is already going run-by-run through the photos to reconstruct
attendance. Capture leader attribution IN THE SAME PASS - it is nearly free at
that moment and expensive to reconstruct separately later.

DECISIONS TO PUT TO PAUL BEFORE BUILDING (ask; do not guess)
1. LEADERS: does leading also count as attendance (they ran it), or only as
   leader credit? One ladder or two? What are the leader rungs?
2. IDENTITY MATCHING from the old-site report to `members` - names vs emails,
   duplicates, and people who attended historically but never registered on the
   new site. This is the riskiest part of the import.
3. WHERE THE SEED LIVES: a column on `members` (+ an "as of" date and provenance)
   vs synthetic attendance rows. Synthetic rows pollute per-run history; a column
   means every count must remember to add it. Same question for leader seeds.
4. SCOPE OF COUNTING: club runs only for now, but the schema must not preclude
   C25K sessions and `source='self_report'` solo runs (both already decided for
   Jan 2027).
5. Do cancelled / on-tour runs count? And do the non-Thursday shapes (e.g. the
   19.9k single-row run on 2026-06-20) count toward the same ladder?
6. Do provisional (poll-only) leader rows count toward a rung before Paul
   confirms them, or only once corroborated?

CONSTRAINTS
- Backend-first: the native app (separate repo, apps/rtr in ~/native-apps) holds
  NO logic and renders API shapes. Build the endpoint before any screen.
- Attendance is personal data. Awards private by default, opt-in public via a
  consent flag in the photo_consent mould. Get RLS right - the app's leader reads
  currently go through server endpoints with requireLeader(), not client RLS.
- The import must be IDEMPOTENT and re-runnable; Paul will iterate on the photo
  reconstruction over weeks.
- Migrations: staging/dev first. ASK before applying anything to production.
- Verify every claim against the code and the live DB before accepting it.

FIRST SESSION DELIVERABLES
Do not write app-side code. Produce: (a) a schema proposal + migration for the
seed, the leader "led by" relation, the milestone/award state, and the consent
flag; (b) an import path for eras 1 and 2, idempotent, with a dry-run mode;
(c) an endpoint exposing a member's lifetime count and rungs; (d) the answers to
the five decisions above, raised with Paul first. Propose a commit at each
verified milestone.
```

---

## Decision record (built session, 10 Jul 2026)

All open questions above were put to Paul and decided; the build follows these.

1. **Model: parkrun.** Two lifetime counters per member - RUN (turned up) and
   VOLUNTEER (was there as a leader). No per-group counting anywhere ("8
   jeffing + 21 5k" is neither wanted nor supported by the data);
   `group_key` survives as descriptive metadata only. Night/groups modelling
   question resolved as Option B: `runs` untouched, no night entity, the
   counting unit is a distinct run date.
2. **Rungs: 10 / 25 / 50 / 100, then every 100th** (parkrun's newer model),
   same ladder for both counters. Several leaders cross 100 at launch - a
   launch moment, not a problem.
3. **Leading implies attending** (revised mid-session by Paul): checking in a
   member who is a run leader auto-writes a `run_leadership` row, so a
   leader-night earns BOTH credits. Historic equivalent: poll leader-nights
   seed both the volunteer AND run ladders (e.g. Paul 0 CSV + 160 polls =
   160/160; Neil 142 + 25 = 167/25). The overlap where an old-site leader
   also checked in as a runner is accepted imprecision ("close enough for a
   running club"). Ran-but-didn't-lead nights are an override: delete that
   night's `run_leadership` row.
4. **Poll availability = leader attendance.** No provisional/confirmation
   layer, no photo corroboration required for leader history.
5. **Eras and dates.** Old-site CSV runs to the week before the new site:
   run seed as-of 2026-04-30. Volunteer (polls) seed as-of 2026-07-09. The
   photo reconstruction gap is exactly 4 May - 9 Jul 2026 and imports as
   `attendance` rows with `source='photo'` (attendance only - NO
   `run_leadership` rows, the polls seed already covers leaders to 9 Jul).
   Live `run_leadership` starts 16 Jul 2026.
6. **GDPR / unmatched people: not imported.** ~380 people in the CSV and 9
   poll leaders never registered on the new site; their data stays in Paul's
   offline source files only (which is also why `data/leader-polls/` and
   `data/attendance-backfill/` are gitignored - the repo is public). The
   importer is idempotent and re-runnable, so anyone who registers later
   (e.g. Si Foulkes) gets their history attached by a re-run. Zero-count CSV
   rows ignored.
7. **Scope: cancelled runs don't count** (not in the data anyway - these are
   check-ins). **On-tour counts. Socials don't** (e.g. the 20 Jun Steel
   Cotton stage, `run_type='social'`), walks don't; qualifying =
   `run_type IN ('regular','c25k')` so January's C25K sessions count from
   day one.
8. **Seeds live in `attendance_seeds`** (kind, count, as_of, source,
   source_detail), not synthetic attendance rows and not a members column.
   `source='manual'` is the by-exception adjustment channel, worked through
   with live data.

Built: `supabase-migration-attendance-recognition.sql` (applied to dev 10 Jul;
production pending approval), `scripts/import_attendance_seeds.py` (dry-run
default; seed import verified idempotent on dev), `lib/recognition.ts`,
`GET /api/attendance/summary`, volunteer auto-credit in
`POST /api/leader/checkin`. Dry-run report against prod members:
`data/attendance-backfill/dry-run-report.txt` (77 members matched, 2,683 of
5,630 CSV sessions attach; 17 of 26 poll leaders match, 1,190 of 1,383
leader-nights attach).

Still open (next sessions): awards-row computation/notification job (the
`awards` table exists, nothing writes it yet), the leader recognition loop,
member-facing display in the native app, era-2 photo reconstruction workflow
(importer `--checkins` mode is ready and expects `date,email_or_name,group_key`).
