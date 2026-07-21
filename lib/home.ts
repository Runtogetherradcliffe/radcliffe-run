import { supabaseAdmin } from '@/lib/supabase'
import { COUNTED_RUN_TYPES } from '@/lib/recognition'

/**
 * Runner-home derivations (GET /api/home). Decision record:
 * docs/RUNNER_HOME_BRIEF.md (workshop + Pencil sessions, 11 Jul 2026).
 * Backend-first rule: the app holds no logic - every surface here is
 * server-derived so the app never re-derives or duplicates it.
 */

export type GroupKey = '8k' | '5k' | 'jeff'
const GROUPS: GroupKey[] = ['8k', '5k', 'jeff']

export type GroupCounts = Record<GroupKey, number>

/**
 * Pure: the majority group over live-era group_key counts. Live era = rows
 * with group_key set at all - photo-era backfill mostly lacks it, so a
 * non-null count IS the live-era filter (RUNNER_HOME_BRIEF.md). Null until
 * 3+ counted check-ins AND a strict majority (>50% of the total) - null
 * means the app renders equal tiles (cold start and no-majority are the
 * same render, deliberately).
 */
export function usualGroupFromCounts(counts: GroupCounts): GroupKey | null {
  const total = GROUPS.reduce((sum, g) => sum + counts[g], 0)
  if (total < 3) return null
  for (const g of GROUPS) {
    if (counts[g] > total / 2) return g
  }
  return null
}

export interface UsualGroupResult {
  usualGroup: GroupKey | null
  groupCounts: GroupCounts
}

/** Leader-inclusive by design (workshop decision) - only behavioural
 * interventions exclude leaders, not this tile. */
export async function usualGroupForMember(memberId: string): Promise<UsualGroupResult> {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('attendance')
    .select('group_key')
    .eq('member_id', memberId)
    .not('group_key', 'is', null)
  if (error) throw new Error(error.message)

  const groupCounts: GroupCounts = { '8k': 0, '5k': 0, jeff: 0 }
  for (const row of data ?? []) {
    const g = row.group_key as string | null
    if (g && (GROUPS as string[]).includes(g)) groupCounts[g as GroupKey]++
  }
  return { usualGroup: usualGroupFromCounts(groupCounts), groupCounts }
}

export interface CollectiveStat {
  count: number
  runDate: string
}

/**
 * Distinct members checked in on the most recent qualifying run date
 * (run_type IN ('regular','c25k'), not cancelled - the AGENTS.md counting
 * invariant). A cancelled week keeps showing the previous run - no zero
 * states. Null only when no qualifying run has ever happened yet.
 */
export async function collectiveStat(): Promise<CollectiveStat | null> {
  const db = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const { data: recentRun, error: runError } = await db
    .from('runs')
    .select('date')
    .in('run_type', COUNTED_RUN_TYPES)
    .eq('cancelled', false)
    .lte('date', today)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (runError) throw new Error(runError.message)
  if (!recentRun) return null

  const { data: runsOnDate, error: runsError } = await db
    .from('runs')
    .select('id')
    .eq('date', recentRun.date)
    .in('run_type', COUNTED_RUN_TYPES)
    .eq('cancelled', false)
  if (runsError) throw new Error(runsError.message)
  const runIds = (runsOnDate ?? []).map((r) => r.id)
  if (runIds.length === 0) return null

  const { data: attendanceRows, error: attError } = await db
    .from('attendance')
    .select('member_id')
    .in('run_id', runIds)
  if (attError) throw new Error(attError.message)

  const distinctMembers = new Set((attendanceRows ?? []).map((r) => r.member_id))
  return { count: distinctMembers.size, runDate: recentRun.date }
}

/** The weekly note's candidate-run window, and its fallback lifespan when
 * that window holds no runs at all (off-season gap, sync failure): 7 days
 * from the last text change. */
export const WEEKLY_NOTE_FRESH_MS = 7 * 24 * 60 * 60 * 1000

/** A run keeps the note alive until "the morning after": its date at 00:00
 * UTC plus 28h = 04:00 the next day. Approximate on purpose - UK local 4am
 * vs 5am across BST is immaterial for "gone by breakfast". */
const MORNING_AFTER_MS = 28 * 60 * 60 * 1000

/** The date range (inclusive, YYYY-MM-DD) of runs that can anchor the note's
 * lifespan: runs on or after the day it was written, within the 7-day
 * window. Exported so /api/home queries exactly the range the freshness
 * function will consider. */
export function weeklyNoteAnchorWindow(updatedAt: string): { from: string; to: string } {
  const t = new Date(updatedAt).getTime()
  return {
    from: new Date(t).toISOString().slice(0, 10),
    to: new Date(t + WEEKLY_NOTE_FRESH_MS).toISOString().slice(0, 10),
  }
}

/** The note, or null once it has expired / was cleared / was never set. All
 * freshness logic lives HERE - the app renders the string when present and
 * never re-derives (backend-first rule).
 *
 * Lifespan is SCHEDULE-anchored (Paul, 21 Jul): the note lives until the
 * morning after the LAST run dated within 7 days of writing it. An ordinary
 * week (Thursday only) dies Friday ~4am; a social weekend's Sunday run
 * keeps it up through the weekend; a bank-holiday Monday extends it again.
 * Cancelled runs anchor too, deliberately - "Thursday is CANCELLED" must
 * live until the would-have-been night. Runs before the note was written
 * never anchor (a past run must not expire a note about a coming one), and
 * with no runs in the window at all the plain 7-day cap applies.
 * `runDates` are the YYYY-MM-DD dates from the runs table inside
 * weeklyNoteAnchorWindow; `now` is injectable for tests. */
export function freshWeeklyNote(
  s: { weekly_note: string | null; weekly_note_updated_at: string | null } | null,
  runDates: string[],
  now: number = Date.now(),
): string | null {
  const text = s?.weekly_note?.trim()
  if (!text || !s?.weekly_note_updated_at) return null
  const edited = new Date(s.weekly_note_updated_at).getTime()
  if (Number.isNaN(edited)) return null
  const { from, to } = weeklyNoteAnchorWindow(s.weekly_note_updated_at)
  const anchors = runDates
    .filter((d) => d >= from && d <= to)
    .map((d) => Date.parse(`${d}T00:00:00Z`))
    .filter((t) => !Number.isNaN(t))
  const expiry = anchors.length
    ? Math.max(...anchors) + MORNING_AFTER_MS
    : edited + WEEKLY_NOTE_FRESH_MS
  return now <= expiry ? text : null
}
