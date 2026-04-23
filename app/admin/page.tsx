import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Admin — radcliffe.run' }

/* ── Stat card ── */
function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#f5a623', marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

/* ── Nav link ── */
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{
      display: 'block', padding: '9px 14px',
      borderRadius: 8, textDecoration: 'none', color: '#888', fontSize: 14, fontWeight: 500,
      fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
    }}
    className="admin-nav-link">
      {label}
    </a>
  )
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch stats + settings
  const [{ count: memberCount }, { count: runCount }, { data: recentMembers }, { data: settings }] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('runs').select('*', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]),
    supabase.from('members').select('first_name, last_name, email, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('site_settings').select('hero_image_url, sync_thursday_sheet, sync_social_sheet').single(),
  ])

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
            <NavLink href="/admin"          label="Dashboard" />
            <NavLink href="/admin/members"  label="Members" />
            <NavLink href="/admin/runs"     label="Runs" />
            <NavLink href="/admin/roundups" label="Roundups" />
            <NavLink href="#settings"       label="Settings" />
          </nav>
          <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 24, paddingTop: 24, padding: '24px 12px 0' }}>
            <NavLink href="/" label="View site" />
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, padding: 32, maxWidth: 900 }}>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Overview</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
            <StatCard value={memberCount ?? 0} label="Registered members" sub="All time" />
            <StatCard value={runCount ?? 0}    label="Upcoming runs" sub="Scheduled ahead" />
            <StatCard value="—"               label="Roundups published" sub="Coming soon" />
          </div>

          {/* Recent registrations */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent registrations</h2>
              <a href="/admin/members" style={{ fontSize: 12, color: '#f5a623', textDecoration: 'none' }}>View all →</a>
            </div>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              {recentMembers && recentMembers.length > 0 ? (
                recentMembers.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 20px', borderBottom: i < recentMembers.length - 1 ? '1px solid #1a1a1a' : 'none',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#ccc' }}>{m.first_name} {m.last_name}</p>
                      <p style={{ fontSize: 12, color: '#555' }}>{m.email}</p>
                    </div>
                    <p style={{ fontSize: 12, color: '#333' }}>
                      {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#555' }}>No registrations yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Site settings */}
          <div id="settings" style={{ marginTop: 48 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Site settings</h2>
              <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Hero image and data sync sources.</p>
            </div>
            <SettingsClient initial={{
              hero_image_url:      settings?.hero_image_url      ?? null,
              sync_thursday_sheet: settings?.sync_thursday_sheet ?? true,
              sync_social_sheet:   settings?.sync_social_sheet   ?? true,
            }} />
          </div>

        </main>
      </div>

      <style>{`
        .admin-nav-link:hover { background: #111; color: #fff; }
      `}</style>
    </div>
  )
}
