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
