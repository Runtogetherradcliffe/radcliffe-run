import { supabaseAdmin } from '@/lib/supabase'
import { COUNTED_RUN_TYPES, computeAwardRows, type AwardKind, type AwardRow } from '@/lib/recognition'

/**
 * The awards job (docs/ATTENDANCE_RECOGNITION_BRIEF.md, 12 Jul 2026 build):
 * for every active member and both ladders (run, volunteer), compare
 * current lifetime totals against existing `awards` rows and write the
 * crossings that are missing. Idempotent - a re-run with unchanged totals
 * writes nothing. Bulk-fetches everything up front (a handful of queries
 * regardless of member count) rather than per-member round trips.
 *
 * Dating and the first-run backfill rule live in
 * lib/recognition.ts (computeAwardRows) - this module is the DB-facing
 * shell: fetch, group into per-member sorted date lists, call the pure
 * function, upsert.
 */

interface JoinedRow {
  member_id: string
  runs: { date: string; run_type: string | null; cancelled: boolean | null } | null
}

function sortedQualifyingDatesByMember(rows: JoinedRow[] | null): Map<string, string[]> {
  const byMember = new Map<string, Set<string>>()
  for (const row of rows ?? []) {
    const run = row.runs
    if (!run || run.cancelled) continue
    if (!COUNTED_RUN_TYPES.includes(run.run_type ?? '')) continue
    let set = byMember.get(row.member_id)
    if (!set) {
      set = new Set()
      byMember.set(row.member_id, set)
    }
    set.add(run.date)
  }
  const result = new Map<string, string[]>()
  for (const [id, set] of byMember) result.set(id, [...set].sort())
  return result
}

export interface AwardsJobResult {
  membersProcessed: number
  awardsWritten: number
}

export async function runAwardsJob(): Promise<AwardsJobResult> {
  const db = supabaseAdmin()
  const nowIso = new Date().toISOString()

  const [membersRes, seedsRes, attendanceRes, leadershipRes, existingRes] = await Promise.all([
    db.from('members').select('id').eq('status', 'active'),
    db.from('attendance_seeds').select('member_id, kind, count'),
    db.from('attendance').select('member_id, runs!inner(date, run_type, cancelled)'),
    db.from('run_leadership').select('member_id, runs!inner(date, run_type, cancelled)'),
    db.from('awards').select('member_id, kind, rung'),
  ])
  const firstError =
    membersRes.error ?? seedsRes.error ?? attendanceRes.error ?? leadershipRes.error ?? existingRes.error
  if (firstError) throw new Error(firstError.message)

  const seedByKind: Record<AwardKind, Map<string, number>> = { run: new Map(), volunteer: new Map() }
  for (const s of seedsRes.data ?? []) {
    const kind = s.kind as AwardKind
    const map = seedByKind[kind]
    if (!map) continue
    map.set(s.member_id, (map.get(s.member_id) ?? 0) + s.count)
  }

  const datesByKind: Record<AwardKind, Map<string, string[]>> = {
    run: sortedQualifyingDatesByMember(attendanceRes.data as unknown as JoinedRow[]),
    volunteer: sortedQualifyingDatesByMember(leadershipRes.data as unknown as JoinedRow[]),
  }

  const existingByMemberKind = new Map<string, Set<number>>()
  for (const a of existingRes.data ?? []) {
    const key = `${a.member_id}:${a.kind}`
    let set = existingByMemberKind.get(key)
    if (!set) {
      set = new Set()
      existingByMemberKind.set(key, set)
    }
    set.add(a.rung)
  }

  const rowsToInsert: AwardRow[] = []
  for (const m of membersRes.data ?? []) {
    for (const kind of ['run', 'volunteer'] as const) {
      const seed = seedByKind[kind].get(m.id) ?? 0
      const dates = datesByKind[kind].get(m.id) ?? []
      const existing = existingByMemberKind.get(`${m.id}:${kind}`) ?? new Set<number>()
      rowsToInsert.push(...computeAwardRows(m.id, kind, seed, dates, existing, nowIso))
    }
  }

  if (rowsToInsert.length > 0) {
    const { error } = await db
      .from('awards')
      .upsert(rowsToInsert, { onConflict: 'member_id,kind,rung', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
  }

  return { membersProcessed: (membersRes.data ?? []).length, awardsWritten: rowsToInsert.length }
}
