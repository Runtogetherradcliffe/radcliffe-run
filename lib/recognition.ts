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

/** Rungs: 10 / 25 / 50 / 100, then every 100th (parkrun's newer model). */
export function rungsAchieved(count: number): number[] {
  const rungs = [10, 25, 50].filter((r) => count >= r)
  for (let r = 100; r <= count; r += 100) rungs.push(r)
  return rungs
}

export function nextRung(count: number): number {
  for (const r of [10, 25, 50, 100]) if (count < r) return r
  return (Math.floor(count / 100) + 1) * 100
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
