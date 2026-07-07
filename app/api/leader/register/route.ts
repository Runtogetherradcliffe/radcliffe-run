import { NextRequest, NextResponse } from 'next/server'
import { requireLeader } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/leader/register?run_id=<uuid>
 * The check-in roster for one run: every active member (walk-up handling is
 * "search the whole register" - at club scale the roster IS the member
 * list), tonight's check-in state per member, and live group counters.
 * Auth: run leaders only, cookie or Bearer.
 */
export async function GET(req: NextRequest) {
  const leader = await requireLeader(req)
  if (!leader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const runId = req.nextUrl.searchParams.get('run_id')
  if (!runId) {
    return NextResponse.json({ error: 'run_id required' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: run, error: runError } = await db
    .from('runs')
    .select('id, date, title, meeting_point')
    .eq('id', runId)
    .maybeSingle()
  if (runError || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const [{ data: members, error: membersError }, { data: attendance }, { data: recent }] =
    await Promise.all([
      db
        .from('members')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name', { ascending: true }),
      db.from('attendance').select('member_id, group_key').eq('run_id', runId),
      db
        .from('attendance')
        .select('member_id, group_key, recorded_at')
        .not('group_key', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(500),
    ])

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  const tonight = new Map<string, string | null>()
  for (const a of attendance ?? []) tonight.set(a.member_id, a.group_key)

  const lastGroup = new Map<string, string>()
  for (const row of recent ?? []) {
    if (row.group_key && !lastGroup.has(row.member_id)) {
      lastGroup.set(row.member_id, row.group_key)
    }
  }

  const counts: Record<string, number> = {}
  for (const a of attendance ?? []) {
    const k = a.group_key ?? 'other'
    counts[k] = (counts[k] ?? 0) + 1
  }

  return NextResponse.json({
    run,
    members: (members ?? []).map(m => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      checked_in: tonight.has(m.id),
      group_key: tonight.get(m.id) ?? lastGroup.get(m.id) ?? null,
    })),
    counts,
    total: (attendance ?? []).length,
  })
}
