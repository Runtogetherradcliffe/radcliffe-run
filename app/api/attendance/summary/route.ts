import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { lifetimeCounts } from '@/lib/recognition'

/**
 * GET /api/attendance/summary
 * The signed-in member's own lifetime attendance recognition state: run and
 * volunteer ladders (total = era-1 seed + recorded nights), rungs achieved,
 * next rung. Auth: any member, cookie or Bearer (native app). Attendance is
 * personal data - this route only ever returns the caller's own counts;
 * awards_public governs club-facing celebration elsewhere, not this.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: member } = await db
    .from('members')
    .select('id, awards_public, status')
    .eq('email', user.email)
    .maybeSingle()
  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'No member record' }, { status: 404 })
  }

  try {
    const counts = await lifetimeCounts(member.id)
    return NextResponse.json({ ...counts, awardsPublic: !!member.awards_public })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    )
  }
}
