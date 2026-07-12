# Awards loop - session brief

**What this is.** A self-contained prompt for the session that builds the
awards machinery: the cron that turns counts into dated award rows, the
admin digest, and the leader recognition loop at check-in. Written 11 Jul
2026, after the recognition backend, backfill, and My Ladder app build all
shipped. Decisions below were made by Paul on 11 Jul - do not reopen them.

**The design in one line.** Live moment at check-in (leader sees "200th run
tonight" and says well done in person) + durable record each morning (awards
rows + digest email to admin) + consent-gated public celebration (Paul
celebrates `awards_public` members in roundups, by hand for now).

---

```
Build the awards loop for radcliffe.run: the awards cron job, the admin
digest email, and milestone flags in the leader check-in register.

READ FIRST
- AGENTS.md - especially the attendance-counting invariant: the unit is a
  NIGHT (COUNT(DISTINCT runs.date), run_type IN ('regular','c25k'), not
  cancelled), counts come from lib/recognition.ts (do NOT write a new
  counter), and awards/attendance_seeds/run_leadership are service-role
  only.
- docs/ATTENDANCE_RECOGNITION_BRIEF.md decision record - the whole system's
  decisions, eras and seed semantics.
- docs/RECOGNITION_DESIGN_BRIEF.md - the app build's decision record: the
  app currently triggers its Milestone screen from an INTERIM local
  last-seen-rungs store; the awards machinery built here supersedes it
  (a later app change - not this session).
- lib/recognition.ts (rungsAchieved / nextRung / lifetimeCounts),
  app/api/leader/register/route.ts, app/api/cron/send-emails/route.ts and
  lib/sendScheduledEmail.ts (the claim-lock pattern), lib/brevo.ts.

CURRENT STATE (verify, don't trust)
- `awards` table exists on dev AND production, empty, RLS enabled with no
  policies: (member_id, kind run|volunteer, rung, achieved_on date NULL-able,
  notified_at, UNIQUE(member_id, kind, rung)). Nothing writes it.
- Counts are live: seeds + attendance + run_leadership all populated;
  GET /api/attendance/summary serves them.
- Crons: Vercel Hobby allows ONE schedule per day per cron; existing crons
  are send-emails 8am and gdpr-cleanup 3am, and cron-job.org ALSO triggers
  send-emails daily as a backstop - so anything folded in there can run
  TWICE and must be idempotent/claim-locked.

DECISIONS ALREADY MADE (Paul, 11 Jul 2026 - do not relitigate)
1. PRIVACY LINE: leader-facing milestone flags at check-in are NOT gated on
   awards_public - operational club recognition, same legitimate basis as
   leaders seeing emergency contacts (this IS the workshop's "leader
   recognition loop"). awards_public gates PUBLIC celebration only
   (roundups, socials, anything outside the app and leader tools).
2. DIGEST: admin only (ADMIN_EMAILS; currently Paul). Sent only when there
   is something to report - never an empty email.
3. REGISTER FLAGS: milestone nights AND "first run tonight" for genuine
   newcomers. Leaders' own volunteer crossings flag the same way (leaders
   check each other in).
4. Seed-era rungs: awards rows with achieved_on NULL, written once, NEVER
   notified or celebrated (decided 10 Jul, unchanged).

WHAT TO BUILD
1. The awards job (idempotent, safe to run twice a day):
   - For every active member compute run + volunteer rungs via
     lib/recognition.ts and upsert missing `awards` rows.
   - achieved_on = the actual night the count reached the rung, derived by
     ordering the member's distinct qualifying run dates and taking the
     (rung - seed)th; rungs reached inside the seed get achieved_on NULL.
     Late-arriving history (photo stragglers, seed re-runs) may create
     rows dated in the past - that is correct, and they still get digested
     once.
   - Fold into the existing 8am cron path (Hobby one-schedule limit).
     Follow the send-emails claim pattern for the digest so the
     cron-job.org double-fire cannot send it twice: claim rows by stamping
     notified_at WHERE notified_at IS NULL AND achieved_on IS NOT NULL
     (RETURNING the claimed rows), then send the digest from the claimed
     set. Keep maxDuration in mind; the whole job is ~100 members of
     arithmetic - trivial.
2. The admin digest email (lib/brevo.ts, to ADMIN_EMAILS):
   - Lists each newly crossed rung: member, ladder (runs / leading), rung,
     the night it happened, and their awards_public value - so Paul knows
     at a glance who may be celebrated publicly in the roundup and who is
     private. Crossings happen Thursday night; the 8am Friday run catches
     them.
3. Register enrichment (GET /api/leader/register - the check-in roster):
   For each roster member, computed against counts EXCLUDING tonight's
   date (they may already be checked in when the leader looks):
   - milestone_tonight: { kind: 'run'|'volunteer', rung } when tonight's
     night makes their total exactly a rung (10/25/50/75/100 then every 25;
     centuries are the celebrated tier - use lib/recognition.ts, never a
     literal list).
     Volunteer applies to is_run_leader members (their check-in also
     writes run_leadership).
   - first_run_tonight: true when their lifetime total INCLUDING seed is 0
     - a member with old-site history returning after a gap is NOT a
     first-timer.
   Do it in one aggregate query, not N+1; the roster is ~100 members.
   The app renders these flags in a LATER native session - this session
   ships the shapes.
4. Tests: unit tests for achieved_on derivation (incl. seed-era NULL,
   late-arriving history) and the register flags (first-run vs returning
   member, already-checked-in tonight). Extend the access harness only if
   route auth surface changes (it should not - register already requires
   requireLeader()).
5. Docs in the SAME change: AGENTS.md if any invariant is added,
   docs/ARCHITECTURE.md (awards job + digest + register flags), and append
   the decision record to docs/AWARDS_LOOP_BRIEF.md.

OUT OF SCOPE (later)
- App rendering of the register flags and rewiring the Milestone screen's
  shown-once state to the server (native-apps sessions).
- Automated public celebration in roundups - Paul celebrates by hand from
  the digest for now.
- Push notifications for milestones.

CONSTRAINTS
- No em dashes anywhere (CI guard). Staging-first; Paul approves merges.
- No schema migration is expected. If one becomes necessary, dev first and
  ASK before production.
- Verify against dev end-to-end: manufacture a crossing on dev (seed a
  member to 24, add an attendance row, run the job, see the award row +
  digest content), and run typecheck / lint / test / test:access.
```
