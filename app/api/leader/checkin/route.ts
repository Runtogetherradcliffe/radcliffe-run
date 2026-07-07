import { NextRequest, NextResponse } from 'next/server'
import { requireLeader } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/leader/checkin
 * One-tap attendance record: { run_id, member_id, present, group_key? }.
 * present=true upserts (UNIQUE(run_id, member_id) makes re-taps and
 * offline-queue replays idempotent - a double tap cannot double-count);
 * present=false removes the record (mis-tap correction).
 * Auth: run leaders only, cookie or Bearer; recorded_by = the tapping
 * leader's member id.
 */
export async function POST(req: NextRequest) {
  const leader = await requireLeader(req)
  if (!leader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { run_id?: string; member_id?: string; present?: boolean; group_key?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { run_id, member_id, present, group_key } = body
  if (!run_id || !member_id || typeof present !== 'boolean') {
    return NextResponse.json({ error: 'run_id, member_id, present required' }, { status: 400 })
  }
  const GROUPS = ['8k', '5k', 'jeff']
  if (group_key != null && !GROUPS.includes(group_key)) {
    return NextResponse.json({ error: 'invalid group_key' }, { status: 400 })
  }

  const db = supabaseAdmin()

  if (!present) {
    const { error } = await db
      .from('attendance')
      .delete()
      .eq('run_id', run_id)
      .eq('member_id', member_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, present: false })
  }

  const { error } = await db.from('attendance').upsert(
    {
      run_id,
      member_id,
      recorded_by: leader.memberId,
      recorded_at: new Date().toISOString(),
      source: 'leader',
      group_key: group_key ?? null,
    },
    { onConflict: 'run_id,member_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, present: true })
}
