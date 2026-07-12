import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET/POST /api/attendance/pending
 * The app-facing contract for pending celebrations (docs/ATTENDANCE_RECOGNITION_BRIEF.md,
 * 12 Jul 2026 build) - a thin, stable surface so the app's trigger-swap
 * session (interim local last-seen state -> server state) is pure app work.
 *
 * GET returns the caller's own awards with notified_at IS NULL (fresh
 * crossings not yet celebrated): [{ ladder, rung, achieved_on }]. Auth: any
 * member, cookie or Bearer. Personal data - only ever the caller's own rows.
 *
 * POST { ladder, rung } marks that one row notified (the app calls this AT
 * presentation of the Milestone screen, once). Idempotent: marking an
 * already-notified or non-existent row is a no-op, still 200.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: member } = await db
    .from('members')
    .select('id, status')
    .eq('email', user.email)
    .maybeSingle()
  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'No member record' }, { status: 404 })
  }

  const { data, error } = await db
    .from('awards')
    .select('kind, rung, achieved_on')
    .eq('member_id', member.id)
    .is('notified_at', null)
    .order('rung', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((a) => ({ ladder: a.kind, rung: a.rung, achieved_on: a.achieved_on }))
  )
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: member } = await db
    .from('members')
    .select('id, status')
    .eq('email', user.email)
    .maybeSingle()
  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'No member record' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const ladder = body?.ladder
  const rung = body?.rung
  if ((ladder !== 'run' && ladder !== 'volunteer') || typeof rung !== 'number') {
    return NextResponse.json({ error: 'ladder and rung are required' }, { status: 400 })
  }

  const { error } = await db
    .from('awards')
    .update({ notified_at: new Date().toISOString() })
    .eq('member_id', member.id)
    .eq('kind', ladder)
    .eq('rung', rung)
    .is('notified_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
