import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import C25KRoster from './C25KRoster'

export const metadata = { title: 'C25K Roster - radcliffe.run' }

export default async function C25KRosterPage() {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/leader/login')

  // Verify leader
  const { data: leader } = await supabaseAdmin()
    .from('members')
    .select('first_name, last_name, is_run_leader')
    .eq('email', user.email!)
    .single()

  if (!leader?.is_run_leader) redirect('/leader/login?error=not_a_leader')

  // Fetch C25K members with full emergency + medical data
  const { data: members } = await supabaseAdmin()
    .from('members')
    .select('id, first_name, last_name, mobile, c25k_session, emergency_name, emergency_phone, emergency_relationship, medical_info, photo_consent')
    .eq('status', 'active')
    .eq('cohort', 'c25k')
    .order('first_name', { ascending: true })

  return (
    <C25KRoster
      members={members ?? []}
      leaderName={`${leader.first_name} ${leader.last_name}`}
    />
  )
}
