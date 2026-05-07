import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RoutesAdminClient from './RoutesAdminClient'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Routes — radcliffe.run Admin' }

export default async function RoutesAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Library</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Route descriptions</h1>
          <p style={{ fontSize: 13, color: '#555', marginTop: 6 }}>Edit the description shown for each route on the site and in emails. Changes are saved to the database and override the default text.</p>
        </div>
        <RoutesAdminClient />
      </main>
    </AdminShell>
  )
}
