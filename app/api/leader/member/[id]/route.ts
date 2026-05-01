import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/leader/member/[id]
 * Returns emergency contact + medical info for a single active member.
 * Only accessible to authenticated run leaders.
 * Used by the leader emergency-contact page to load PII on demand
 * rather than sending all member PII to the browser upfront.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Verify authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify the authenticated user is a run leader
  const { data: leader } = await supabaseAdmin()
    .from('members')
    .select('is_run_leader')
    .eq('email', user.email)
    .single()

  if (!leader?.is_run_leader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Fetch the requested member's PII
  const { id } = await params
  const { data: member } = await supabaseAdmin()
    .from('members')
    .select('id, first_name, last_name, mobile, emergency_name, emergency_phone, emergency_relationship, medical_info')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(member)
}
