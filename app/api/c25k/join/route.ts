import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  // Must be signed in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { session } = await req.json()
  if (!['tuesday', 'thursday', 'both'].includes(session)) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  // Find their existing member record (must be active, must not already be c25k)
  const { data: member } = await supabaseAdmin()
    .from('members')
    .select('id, cohort')
    .eq('email', user.email)
    .eq('status', 'active')
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'No active registration found for this email' }, { status: 404 })
  }

  if (member.cohort === 'c25k') {
    return NextResponse.json({ ok: true, alreadyJoined: true })
  }

  // Check capacity before adding them
  const db = supabaseAdmin()
  const { data: capSettings } = await db.from('site_settings').select('c25k_max_registrations').single()
  const cap = capSettings?.c25k_max_registrations
  if (cap) {
    const { count } = await db
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('cohort', 'c25k')
      .eq('status', 'active')
    if ((count ?? 0) >= cap) {
      return NextResponse.json({ error: 'Sorry, this cohort is now full.' }, { status: 409 })
    }
  }

  // Update their cohort and session preference
  const { error } = await db
    .from('members')
    .update({ cohort: 'c25k', c25k_session: session })
    .eq('id', member.id)

  if (error) {
    console.error('[c25k/join] update error:', error)
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
