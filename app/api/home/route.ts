import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { usualGroupForMember, collectiveStat } from '@/lib/home'

/**
 * GET /api/home
 * One member-authed aggregate for the personalised home. Backend-first: the
 * app renders off this payload only, never re-deriving. Auth: any member,
 * cookie or Bearer. 401 signed out, 404 signed-in with no active member row
 * - the app renders its signed-out/cold-start states off those.
 * Does NOT duplicate the milestone summary (GET /api/attendance/summary) -
 * the app already consumes that for the header badge + popover.
 * Decision record: docs/RUNNER_HOME_BRIEF.md.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: member } = await db
    .from('members')
    .select('id, first_name, is_run_leader, status, development_preference')
    .eq('email', user.email)
    .maybeSingle()
  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'No member record' }, { status: 404 })
  }

  try {
    const [usual, stat] = await Promise.all([
      usualGroupForMember(member.id),
      collectiveStat(),
    ])
    return NextResponse.json({
      firstName: member.first_name,
      isRunLeader: !!member.is_run_leader,
      usualGroup: usual.usualGroup,
      groupCounts: usual.groupCounts,
      collectiveStat: stat,
      developmentPreference: member.development_preference ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    )
  }
}
