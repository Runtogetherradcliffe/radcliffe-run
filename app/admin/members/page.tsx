import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import MembersClient from './MembersClient'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Members — radcliffe.run Admin' }

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: members, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, email, mobile, emergency_name, emergency_phone, emergency_relationship, medical_info, consent_data, health_declaration, photo_consent, email_opt_out, status, created_at, is_run_leader, uka_number')
    .order('created_at', { ascending: false })

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Directory</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Members</h1>
        </div>

        {error ? (
          <p style={{ color: '#e05252', fontSize: 14 }}>Failed to load members: {error.message}</p>
        ) : (
          <MembersClient members={members ?? []} />
        )}
      </main>
    </AdminShell>
  )
}
