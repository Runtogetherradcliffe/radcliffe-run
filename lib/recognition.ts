import { supabaseAdmin } from '@/lib/supabase'

/**
 * Attendance recognition - lifetime counting + rungs (parkrun model).
 * Decision record: docs/ATTENDANCE_RECOGNITION_BRIEF.md (10 Jul 2026).
 *
 * The unit is a NIGHT ATTENDED, never an attendance row: 8k attendance hangs
 * off the 5k anchor row and Jeffing has no row at all, so counting rows would
 * both under- and over-credit. Count DISTINCT run DATES, filtered to
 * qualifying runs: run_type 'regular' (and 'c25k' from Jan 2027), not
 * cancelled. Socials and walks never count. On-tour counts (no filter).
 * Lifetime total = era-1 seed(s) + distinct recorded dates.
 */

export const COUNTED_RUN_TYPES = ['regular', 'c25k']

/**
 * Rung ladder (Paul, 12 Jul 2026): approach rungs 10 / 25 / 50 / 75 / 100,
 * then every 25 forever (125, 150, 175, ...). Both ladders (run and
 * volunteer) share this list. Centuries (every 100th) stay the celebrated
 * solid-coin tier - see `isCentury`; all other rungs are the quiet tier.
 * The old list (10/25/50/100 then every 100th) left a weekly regular ~2
 * years from the next badge after 100; every-25 makes it roughly 6 months.
 * Generative on purpose so it never needs another edit as totals climb.
 * Decision record: docs/ATTENDANCE_RECOGNITION_BRIEF.md.
 */
const APPROACH_RUNGS = [10, 25, 50, 75, 100]
const RUNG_STEP = 25

export function rungsAchieved(count: number): number[] {
  const rungs = APPROACH_RUNGS.filter((r) => count >= r)
  for (let r = 100 + RUNG_STEP; r <= count; r += RUNG_STEP) rungs.push(r)
  return rungs
}

export function nextRung(count: number): number {
  for (const r of APPROACH_RUNGS) if (count < r) return r
  return (Math.floor(count / RUNG_STEP) + 1) * RUNG_STEP
}

/** Celebrated tier: every 100th rung fills the solid coin; the rest are quiet. */
export function isCentury(rung: number): boolean {
  return rung % 100 === 0
}

export interface LadderState {
  total: number
  seed: number
  recorded: number
  rungs: number[]
  nextRung: number
  toNext: number
}

interface JoinedRunRow {
  runs: { date: string; run_type: string | null; cancelled: boolean | null }
}

function countNights(rows: JoinedRunRow[] | null): number {
  const dates = new Set<string>()
  for (const row of rows ?? []) {
    const run = row.runs
    if (!run || run.cancelled) continue
    if (!COUNTED_RUN_TYPES.includes(run.run_type ?? '')) continue
    dates.add(run.date)
  }
  return dates.size
}

function ladder(seed: number, recorded: number): LadderState {
  const total = seed + recorded
  return {
    total,
    seed,
    recorded,
    rungs: rungsAchieved(total),
    nextRung: nextRung(total),
    toNext: nextRung(total) - total,
  }
}

export type AwardKind = 'run' | 'volunteer'

export interface AwardRow {
  member_id: string
  kind: AwardKind
  rung: number
  achieved_on: string | null
  notified_at: string | null
}

/**
 * Pure computation for the awards job (lib/awardsJob.ts): given a member's
 * seed, their chronologically SORTED distinct qualifying dates, and the
 * rungs already recorded in `awards`, return the rows still missing.
 *
 * Dating (docs/ATTENDANCE_RECOGNITION_BRIEF.md, 12 Jul 2026 build): a rung
 * <= seed was crossed pre-site and gets achieved_on NULL ("already
 * achieved", never dated). A rung > seed was crossed live, on the
 * (rung - seed)th recorded date (1-indexed into sortedDates).
 *
 * FIRST-RUN BACKFILL RULE (load-bearing): if this member+kind has NO
 * existing award rows at all, every rung being written now is that
 * member's backfill moment - all get notified_at = nowIso so the
 * celebration-trigger switchover never fires a burst of retro
 * celebrations. Once a member has ANY existing rows, newly-missing rungs
 * are fresh crossings and get notified_at = null (celebration pending).
 */
export function computeAwardRows(
  memberId: string,
  kind: AwardKind,
  seed: number,
  sortedDates: string[],
  existingRungs: Set<number>,
  nowIso: string
): AwardRow[] {
  const total = seed + sortedDates.length
  const missing = rungsAchieved(total).filter((r) => !existingRungs.has(r))
  if (missing.length === 0) return []

  const isBackfill = existingRungs.size === 0
  return missing.map((rung) => ({
    member_id: memberId,
    kind,
    rung,
    achieved_on: rung > seed ? sortedDates[rung - seed - 1] ?? null : null,
    notified_at: isBackfill ? nowIso : null,
  }))
}

/**
 * Runs-ladder-only milestone check for the leader register (Runs ladder
 * only, per the check-in milestone field decision). For each member,
 * the rung they would CROSS if checked in tonight: their lifetime run
 * total EXCLUDING any of tonight's attendance rows (identified by the
 * anchor run_id, since the whole night's register - all groups - hangs
 * off one run row), plus one, IF that lands exactly on a rung.
 * Bulk (2 queries total) so the register endpoint doesn't do
 * per-member round trips.
 */
export async function runMilestonesTonight(
  memberIds: string[],
  excludeRunId: string
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>()
  if (memberIds.length === 0) return result

  const db = supabaseAdmin()
  const [seedsRes, attendanceRes] = await Promise.all([
    db.from('attendance_seeds').select('member_id, count').eq('kind', 'run').in('member_id', memberIds),
    db
      .from('attendance')
      .select('member_id, run_id, runs!inner(date, run_type, cancelled)')
      .in('member_id', memberIds),
  ])
  if (seedsRes.error) throw new Error(seedsRes.error.message)
  if (attendanceRes.error) throw new Error(attendanceRes.error.message)

  const seedByMember = new Map<string, number>()
  for (const s of seedsRes.data ?? []) {
    seedByMember.set(s.member_id, (seedByMember.get(s.member_id) ?? 0) + s.count)
  }

  const datesByMember = new Map<string, Set<string>>()
  for (const row of (attendanceRes.data ?? []) as unknown as (JoinedRunRow & {
    member_id: string
    run_id: string
  })[]) {
    if (row.run_id === excludeRunId) continue
    const run = row.runs
    if (!run || run.cancelled) continue
    if (!COUNTED_RUN_TYPES.includes(run.run_type ?? '')) continue
    let set = datesByMember.get(row.member_id)
    if (!set) {
      set = new Set()
      datesByMember.set(row.member_id, set)
    }
    set.add(run.date)
  }

  for (const id of memberIds) {
    const total = (seedByMember.get(id) ?? 0) + (datesByMember.get(id)?.size ?? 0)
    const candidate = total + 1
    result.set(id, nextRung(total) === candidate ? candidate : null)
  }
  return result
}

export async function lifetimeCounts(
  memberId: string
): Promise<{ run: LadderState; volunteer: LadderState }> {
  const db = supabaseAdmin()

  const [seedsRes, attendanceRes, leadershipRes] = await Promise.all([
    db.from('attendance_seeds').select('kind, count').eq('member_id', memberId),
    db.from('attendance').select('runs!inner(date, run_type, cancelled)').eq('member_id', memberId),
    db.from('run_leadership').select('runs!inner(date, run_type, cancelled)').eq('member_id', memberId),
  ])
  const firstError = seedsRes.error ?? attendanceRes.error ?? leadershipRes.error
  if (firstError) throw new Error(firstError.message)

  let runSeed = 0
  let volunteerSeed = 0
  for (const s of seedsRes.data ?? []) {
    if (s.kind === 'run') runSeed += s.count
    else if (s.kind === 'volunteer') volunteerSeed += s.count
  }

  return {
    run: ladder(runSeed, countNights(attendanceRes.data as unknown as JoinedRunRow[])),
    volunteer: ladder(volunteerSeed, countNights(leadershipRes.data as unknown as JoinedRunRow[])),
  }
}
