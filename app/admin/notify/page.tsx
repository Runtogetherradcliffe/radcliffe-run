import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import NotifyClient from './NotifyClient'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Notifications — radcliffe.run Admin' }

export default async function AdminNotifyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Count subscribers
  const { count } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32, maxWidth: 680 }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Push notifications</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Send notification</h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--faint)', marginTop: 8 }}>
            {count ?? 0} subscriber{count !== 1 ? 's' : ''} will receive this.
          </p>
        </div>

        <NotifyClient subscriberCount={count ?? 0} />

      </main>
    </AdminShell>
  )
}
