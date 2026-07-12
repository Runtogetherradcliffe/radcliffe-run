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
