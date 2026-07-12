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
crossing a rung (10/25/50/75/100 then every 25 - see the 12 Jul 2026 record
below) is recognised. Run leaders are recognised too, in
the way parkrun recognises volunteers. Nothing exists for any of this today.

READ FIRST (do not skip; the design is already decided in places)
- docs/C25K_ENGAGEMENT_RESEARCH.md - especially "Workshop decisions (6 Jul 2026)"
  and the two award ladders. Ladder B (lifetime rungs, C25K + club runs
  alike) is ADOPTED - rung list revised 12 Jul 2026 (record below). Awards are private by default, opt-in public. There is a
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
   **SUPERSEDED 12 Jul 2026** - the list is now 10 / 25 / 50 / 75 / 100, then
   every 25 forever; centuries stay the celebrated tier. See the 12 Jul
   record at the foot of this file.
3. **Leading implies attending** (revised mid-session by Paul): checking in a
   member who is a run leader auto-writes a `run_leadership` row, so a
   leader-night earns BOTH credits. Historic equivalent: poll leader-nights
   seed both the volunteer AND run ladders. Ran-but-didn't-lead nights are an
   override: delete that night's `run_leadership` row.
   **Double-count fix (later, 10 Jul):** summing full CSV + poll nights
   counted a night twice for leaders who both led (poll) and checked in
   (old site) - Julie Smith read 156 when ~109 is right. Resolution: Paul
   produces dated old-site exports (outset -> the day before each leader's
   first poll answer, in `data/attendance-backfill/precounts/`); a leader's
   oldsite_csv run seed becomes that pre-poll count, and poll nights supply
   the rest (check-ins during their poll era are assumed to be led nights).
   Leaders without an export yet fall back to the over-counting sum with a
   loud dry-run warning.
   **Volunteer-credit exclusions (Paul's call, 10 Jul):** Jane Marsh, Judith
   Godfrey and Tanja Brajkovic receive no volunteer credit and count as
   ordinary runners (full CSV, no poll additions) - see
   `data/attendance-backfill/poll-exclude.json`.
4. **Poll availability = leader attendance.** No provisional/confirmation
   layer, no photo corroboration required for leader history.
5. **Eras and dates.** Old-site CSV runs to the week before the new site:
   run seed as-of 2026-05-07 (corrected 10 Jul: the legacy site counted its
   last run on 7 May - the new site ran in parallel before launch, so the
   7 May night belongs to the CSV seed, not the photo gap). Volunteer
   (polls) seed as-of 2026-07-09. The
   photo reconstruction gap is exactly 14 May - 9 Jul 2026 and imports as
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

Built: `supabase-migration-attendance-recognition.sql` (applied to dev AND
production 10 Jul), `scripts/import_attendance_seeds.py` (dry-run default;
`--html` review page, `--emit-sql` for applying via the Supabase MCP),
`lib/recognition.ts`, `GET /api/attendance/summary`, volunteer auto-credit in
`POST /api/leader/checkin`. SHIPPED 10 Jul 2026: merged to main (ad00e6c) and
seeds imported to production the same day - 106 seed rows, 78 members, 3,741
run credits, 1,179 volunteer credits. Headline launch numbers (run/volunteer):
Paul 160/160, Kate Myers 151/119, Ken Smith 138/131, Delphine 126/126,
Martyn 132/101, Julie Smith 114/109, Kath 111/107, Neil 160/25. Review pages
regenerate from `data/attendance-backfill/` (gitignored).

Still open (next sessions): awards-row computation/notification job (the
`awards` table exists, nothing writes it yet), the /admin/recognition
surface + leader recognition loop, era-2 photo reconstruction workflow
(importer `--checkins` mode is ready and expects `date,email_or_name,group_key`).
The member-facing display SHIPPED 11 Jul 2026 (native app My Ladder screens,
native-apps 905f058 by OTA; build record in docs/RECOGNITION_DESIGN_BRIEF.md).

## Decision record: rung list revised (Paul, 12 Jul 2026)

**New list, both ladders:** approach rungs 10 / 25 / 50 / 75 / 100, then every
25 forever (125, 150, 175, ...). Centuries (every 100th: 100, 200, 300, ...)
remain the celebrated solid-coin tier; every other rung is the quiet tier.
Run and volunteer ladders share the single list. Lives in `lib/recognition.ts`
(`rungsAchieved` / `nextRung` / `isCentury`) as a generative rule, not a
literal array, so it never needs another edit as totals climb. The API
contract is unchanged: `GET /api/attendance/summary` still returns
`{ rungs, nextRung, toNext }` per ladder - only the values move.

**Rationale.** The old list (10/25/50/100 then every 100th) left a weekly
regular roughly two years from the next badge once they passed 100. Every-25
brings that to roughly six months, so recognition keeps arriving at a human
cadence for the long-servers without cheapening the century milestones.

**Rollout order: app first, then site.** The native app is already
rung-agnostic (it renders whatever `rungs`/`nextRung` the API returns) and is
guarded against retro-celebrations - it celebrates only rungs crossed since a
member's last-seen total, so introducing new rungs never fires a backlog of
notifications. That guard shipped by OTA first, by design, which is why this
list change can deploy from the site with no app coordination.

**No retro celebration.** A newly introduced rung that sits below an existing
member's total (e.g. 75 or 125/150 for a 160-total leader) presents as quietly
already-achieved: it appears filled on the Milestones screen with no
celebration, because the app guards on the member's last-seen total rather than
recomputing crossings from zero. The awards table/cron is not built yet; when
it is, it must adopt the same last-seen guard so backfilled rungs are written
(or presented) as `achieved_on` NULL / already-achieved, never as fresh
crossings.

## Decision record: the awards machinery build (12 Jul 2026)

The `awards` table existed (10 Jul migration) but nothing wrote to it. This
session built the job that writes it, the app-facing pending-celebrations
contract, the admin surface, and the check-in milestone field. Read alongside
the ladder/rung-list revision above and docs/RECOGNITION_DESIGN_BRIEF.md
(badge grammar, celebration screen spec) - this is the server-side piece the
app's celebration-trigger swap has been waiting on.

### 1. The awards job (`lib/awardsJob.ts`, `GET /api/cron/awards`)

For every active member and both ladders, compares the current total against
existing `awards` rows and writes exactly the missing crossings.

- **Dating.** A rung `<= seed` was crossed pre-site: `achieved_on` NULL,
  presented as "already achieved", never dated (matches the app's existing
  seed-line treatment). A rung `> seed` was crossed live: `achieved_on` is the
  date of the `(rung - seed)`th qualifying attendance date, sorted
  chronologically - i.e. the exact night the count reached that rung.
- **The backfill-quiet rule (load-bearing, cutoff-based - fixed 12 Jul 2026
  same day as first written).** The first version keyed silencing on "does
  this member+kind have zero existing `awards` rows" - wrong: that proxy
  also matches every brand-new member's REAL first celebration (their rung
  10 IS their first award row), so it would have silenced the rung-10
  celebration for every member who joins after this feature ships,
  including the whole January 2027 C25K cohort. Replaced with a temporal
  cutoff: `AWARDS_BACKFILL_CUTOFF` (`lib/recognition.ts`, `'2026-07-12'`,
  the date this job was deployed). `notified_at = now()` (silenced) when
  `achieved_on` is NULL (a seed rung) OR `achieved_on < AWARDS_BACKFILL_CUTOFF`
  (a live rung crossed before the job existed); otherwise `notified_at = NULL`
  (celebration pending). The decision is made per RUNG from its own date,
  never from whether the member has other existing award rows. This also
  gets a reactivated member (status inactive -> active) right for free:
  their historical crossings, even if only computed for the first time on
  reactivation, carry OLD `achieved_on` dates and stay quiet; only a
  crossing dated after the cutoff celebrates. This is what lets the server
  state eventually supersede the app's local last-seen-rungs guard
  (docs/RECOGNITION_DESIGN_BRIEF.md) without a burst of retro celebrations.
- **Pure core, thin shell.** `computeAwardRows(memberId, kind, seed,
  sortedDates, existingRungs, nowIso)` in `lib/recognition.ts` is the pure,
  unit-tested (tests/recognition.test.ts) implementation of the two rules
  above. `lib/awardsJob.ts` is the DB-facing shell: a handful of bulk queries
  (all members, all seeds, all attendance+runs, all run_leadership+runs, all
  existing awards - never per-member round trips) feeding that pure function,
  then one `upsert(..., { onConflict: 'member_id,kind,rung', ignoreDuplicates:
  true })`.
- **Idempotent, claim-locked.** Re-runs with unchanged totals write nothing
  (verified on dev). The `awards_cron_log` table (new migration,
  `supabase-migration-awards-cron.sql`, applied to dev AND production) is a
  `UNIQUE(ref_date)` claim-lock, exactly mirroring `push_send_log` - a
  same-day retry (cron-job.org retry, manual re-run) skips rather than
  re-computing. This is a courtesy against wasted work, not a correctness
  backstop - the `awards` unique constraint is the real idempotency guarantee.
- **Not a Vercel cron.** Exposed at `/api/cron/awards`, `CRON_SECRET`-gated,
  same pattern as `/api/cron/send-push` - deliberately outside `vercel.json`
  so it doesn't compete for the Hobby plan's one-cron-per-day budget. **Paul
  needs to add a cron-job.org job**: weekly, Thursday ~22:30 UK (after
  check-in traffic), `GET https://www.radcliffe.run/api/cron/awards` with
  `Authorization: Bearer <CRON_SECRET>` (same secret as the other cron-job.org
  jobs - see AGENTS.md for the www-host rule and why the apex won't work).

### 2. App-facing pending-celebrations contract (`GET`/`POST /api/attendance/pending`)

A sibling to `GET /api/attendance/summary`, so the app's eventual swap from
its local last-seen-rungs guard to server state is pure app work against a
contract that is final now:

```
GET /api/attendance/pending
  -> [{ ladder: 'run' | 'volunteer', rung: number, achieved_on: string | null }]
  Auth: any member, cookie or Bearer. Always the caller's own rows
  (awards WHERE member_id = caller AND notified_at IS NULL), ordered by rung
  ascending. Empty array = nothing pending.

POST /api/attendance/pending
  body: { ladder: 'run' | 'volunteer', rung: number }
  -> { ok: true }
  Marks that one row's notified_at = now(). Call this AT presentation of the
  Milestone celebration screen (docs/RECOGNITION_DESIGN_BRIEF.md), once.
  Idempotent: marking an already-notified or non-existent row is still a
  200 no-op (no error branch to handle app-side).
```

No `id` field in the GET response - `(member_id, kind, rung)` is already
unique (the `awards` table's constraint), so `{ ladder, rung }` is enough to
address a row without exposing one. Added to `APP_API_PATHS` (already covered
by the existing `/api/attendance` prefix entry; a test line added anyway,
`tests/appCors.test.ts`, to lock the new path in explicitly).

### 3. `/admin/recognition` (read-only v1)

Lists every crossing, most-recent first (`achieved_on` desc, nulls last, then
`created_at` desc so same-day/seed rows have a stable secondary order):
member name, ladder, rung, achieved date (or "pre-site"), notified state, and
the member's `awards_public` flag shown alongside every row - admins see
everyone's crossings regardless of that flag, which only gates public
celebration in roundups/socials, not admin visibility (same rule as
emergency contacts). Search by name, filter by ladder and notified state.
Follows the existing admin page pattern exactly (server component fetches
with `supabaseAdmin()`, gated by `middleware.ts`'s existing `/admin/*` admin-
email check - no new auth code needed, matching `/admin/routes` and
`/admin/members`). The `awards_public` toggle itself remains member-owned via
the app's PATCH `/api/profile` (shipped 11 Jul) - this page is read-only.

### 4. Check-in milestone field (`GET /api/leader/register`)

Each roster member gains `milestoneTonight: number | null` - the Runs-ladder
rung they would CROSS if checked in tonight: lifetime run total **excluding
any of tonight's attendance rows** (the whole night, all groups, hangs off one
anchor `run_id` - excluding by that id is enough, per "a night is not a run
row" above), plus one, if-and-only-if that lands exactly on a rung.
Runs ladder only (no leading-milestone-tonight field - leading credit is
automatic on check-in, not something a leader "crosses" by choosing a role).
Leaders see it regardless of the member's `awards_public` flag (admin/leader
visibility rule, unaffected by the public-celebration consent flag).
Bulk-computed (`runMilestonesTonight` in `lib/recognition.ts`, two queries
for the whole roster) rather than per-member, matching the register route's
existing bulk-fetch shape.

### Verification (dev, 12 Jul 2026)

Shaped a throwaway test member with `attendance_seeds` (`source='manual'`)
and fabricated qualifying runs/attendance, then exercised the real endpoints
end to end (minted a Supabase Auth session via the Admin API for the
member-authed routes): first run wrote the seed-covered rung with
`achieved_on` NULL and `notified_at` set (backfill); a re-run same day was
skipped by the claim-lock; forcing a fresh crossing on a later run wrote it
with `achieved_on` dated to the correct qualifying date and `notified_at`
NULL; unrelated members' already-written rungs were untouched (idempotent).
`GET /api/attendance/pending` served the pending row, the `POST` cleared it,
a follow-up `GET` returned empty. `milestoneTonight` was `null` when
total+1 landed off a rung, non-null (correct rung) when it landed exactly on
one, and - critically - unaffected by the member's own tonight's check-in row
being present (excluded correctly, not double-counted). Test member, its
auth user, and fabricated runs/attendance/seeds were removed after; the
real backfill this run produced for existing dev members (50 rows, 14
members) was left in place as genuine, correct state, not test pollution.
`/admin/recognition`'s query shape and ordering were verified directly
against the database; the page itself was not click-verified in a browser in
this session (would have required either minting an OTP-based admin session
or temporarily touching a real admin account's credentials, neither of which
felt proportionate) - it follows the identical server-component + middleware-
gating pattern as `/admin/routes` and `/admin/members`, which are known-good
in production.

Migration `supabase-migration-awards-cron.sql` applied to dev AND production;
`supabase-rls-baseline.sql` updated with the new table (service-role only, no
policies, same reasoning as `attendance`/`awards`). `npm run typecheck`,
`npm run lint`, and `npm test` (101 tests) all clean. Staging only - not
merged to main without Paul's approval.

Still open: the cron-job.org job itself (Paul adds it - see section 1 above),
and the app-side wiring of `/api/attendance/pending` to replace the local
last-seen-rungs guard (a later native-apps session, now unblocked).
