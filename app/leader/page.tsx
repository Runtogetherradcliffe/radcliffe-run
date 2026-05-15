import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import LeaderLookup from './LeaderLookup'

export const metadata = { title: 'Emergency Contacts — radcliffe.run' }

export default async function LeaderPage() {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/leader/login')

  // Verify this user is a run leader
  const { data: leader } = await supabaseAdmin()
    .from('members')
    .select('first_name, last_name, uka_number, is_run_leader')
    .eq('email', user.email!)
    .single()

  if (!leader?.is_run_leader) redirect('/leader/login?error=not_a_leader')

  // Fetch members + settings in parallel
  const [{ data: members }, { data: settings }] = await Promise.all([
    supabaseAdmin()
      .from('members')
      .select('id, first_name, last_name, mobile, emergency_name, emergency_phone, emergency_relationship, medical_info, photo_consent')
      .eq('status', 'active')
      .order('last_name', { ascending: true }),
    supabaseAdmin()
      .from('site_settings')
      .select('c25k_enabled')
      .single(),
  ])

  return (
    <LeaderLookup
      members={members ?? []}
      leaderName={`${leader.first_name} ${leader.last_name}`}
      ukaNumber={leader.uka_number ?? undefined}
      c25kEnabled={settings?.c25k_enabled ?? false}
    />
  )
}
