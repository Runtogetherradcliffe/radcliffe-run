import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const FALLBACK_ADMINS = ['paul.j.cox@gmail.com', 'pjcox@fastmail.fm', 'runtogetherradcliffe@gmail.com']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ isLeader: false, isAdmin: false, isC25K: false })
  }

  const adminList = ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS : FALLBACK_ADMINS
  const isAdmin = adminList.includes(user.email.toLowerCase())

  const { data } = await supabaseAdmin()
    .from('members')
    .select('is_run_leader, cohort')
    .eq('email', user.email)
    .single()

  return NextResponse.json({
    isLeader: !!data?.is_run_leader,
    isAdmin,
    isC25K: data?.cohort === 'c25k',
  })
}
