import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import MembersClient from './MembersClient'

export const metadata = { title: 'Members — radcliffe.run Admin' }

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: members, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, email, mobile, emergency_name, emergency_phone, emergency_relationship, medical_info, consent_data, health_declaration, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'Inter, sans-serif' }}>

      {/* Top bar */}
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

        {/* Sidebar */}
        <aside style={{ width: 220, borderRight: '1px solid #1e1e1e', padding: '24px 12px', flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333', padding: '0 14px', marginBottom: 8 }}>Menu</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { href: '/admin',          label: 'Dashboard' },
              { href: '/admin/members',  label: 'Members' },
              { href: '/admin/runs',     label: 'Runs' },
              { href: '/admin/roundups', label: 'Roundups' },
            ].map(({ href, label }) => (
              <a key={href} href={href} style={{
                display: 'block', padding: '9px 14px', borderRadius: 8,
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                color: href === '/admin/members' ? '#fff' : '#888',
                background: href === '/admin/members' ? '#1a1a1a' : 'transparent',
              }}
              className={href !== '/admin/members' ? 'admin-nav-link' : ''}>
                {label}
              </a>
            ))}
          </nav>
          <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 24, paddingTop: 24, padding: '24px 12px 0' }}>
            <a href="/" style={{ display: 'block', padding: '9px 14px', borderRadius: 8, textDecoration: 'none', color: '#888', fontSize: 14, fontWeight: 500 }} className="admin-nav-link">
              View site
            </a>
          </div>
        </aside>

        {/* Main */}
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
      </div>

      <style>{`
        .admin-nav-link:hover { background: #111; color: #fff; }
      `}</style>
    </div>
  )
}
