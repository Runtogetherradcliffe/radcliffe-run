import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RunsClient from './RunsClient'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Runs — radcliffe.run Admin' }

export default async function RunsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: runs, error } = await supabase
    .from('runs')
    .select('*')
    .order('date', { ascending: false })

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Schedule</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Runs</h1>
        </div>

        {error ? (
          <p style={{ color: '#e05252', fontSize: 'var(--text-base)' }}>Failed to load runs: {error.message}</p>
        ) : (
          <RunsClient runs={runs ?? []} />
        )}
      </main>
    </AdminShell>
  )
}
