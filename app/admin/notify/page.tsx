import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import NotifyClient from './NotifyClient'

export const metadata = { title: 'Send notification — Admin' }

export default async function AdminNotifyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Count subscribers
  const { count } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top bar ── */}
      <header style={{ borderBottom: '1px solid #1e1e1e', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#fff' }}>radcliffe.</span><span style={{ color: '#f5a623' }}>run</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#555', marginLeft: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</span>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <p style={{ fontSize: 12, color: '#555' }}>{user.email}</p>
          <a href="/admin/logout" style={{ fontSize: 12, color: '#555', textDecoration: 'none', padding: '6px 12px', border: '1px solid #222', borderRadius: 6 }}>Sign out</a>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 220, borderRight: '1px solid #1e1e1e', padding: '24px 12px', flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333', padding: '0 14px', marginBottom: 8 }}>Menu</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { href: '/admin',          label: 'Dashboard' },
              { href: '/admin/members',  label: 'Members' },
              { href: '/admin/runs',     label: 'Runs' },
              { href: '/admin/roundups', label: 'Roundups' },
              { href: '/admin/notify',   label: 'Notifications' },
            ].map(({ href, label }) => (
              <a key={href} href={href} style={{
                display: 'block', padding: '9px 14px', borderRadius: 8,
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                color: label === 'Notifications' ? '#f5a623' : '#888',
                background: label === 'Notifications' ? '#1a1000' : 'transparent',
              }}>
                {label}
              </a>
            ))}
          </nav>
          <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 24, paddingTop: 24, padding: '24px 12px 0' }}>
            <a href="/" style={{ display: 'block', padding: '9px 14px', borderRadius: 8, textDecoration: 'none', color: '#888', fontSize: 14, fontWeight: 500 }}>View site</a>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, padding: 32, maxWidth: 680 }}>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Push notifications</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Send notification</h1>
            <p style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
              {count ?? 0} subscriber{count !== 1 ? 's' : ''} will receive this.
            </p>
          </div>

          <NotifyClient subscriberCount={count ?? 0} />

        </main>
      </div>
    </div>
  )
}
