import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import SettingsClient from './SettingsClient'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Admin — radcliffe.run' }

/* ── Stat card ── */
function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#f5a623', marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--dim)' }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch stats + settings
  const [{ count: memberCount }, { count: runCount }, { count: roundupCount }, { data: recentMembers }, { data: settings }] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('runs').select('*', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]),
    supabaseAdmin().from('posts').select('*', { count: 'exact', head: true }).eq('type', 'roundup').eq('status', 'published'),
    supabase.from('members').select('first_name, last_name, email, created_at').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin().from('site_settings').select('hero_image_url, sync_thursday_sheet, sync_social_sheet, show_social_calendar, email_default_subject, email_default_opening, email_default_closing, c25k_enabled, c25k_registration_open, c25k_start_date, c25k_cohort_label, c25k_max_registrations, c25k_session_order').single(),
  ])

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32, maxWidth: 900 }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Overview</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
          <StatCard value={memberCount ?? 0} label="Registered members" sub="All time" />
          <StatCard value={runCount ?? 0}    label="Upcoming runs" sub="Scheduled ahead" />
          <StatCard value={roundupCount ?? 0} label="Roundups published" sub="On radcliffe.run" />
        </div>

        {/* Recent registrations */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent registrations</h2>
            <a href="/admin/members" style={{ fontSize: 12, color: '#f5a623', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {recentMembers && recentMembers.length > 0 ? (
              recentMembers.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px', borderBottom: i < recentMembers.length - 1 ? '1px solid #1a1a1a' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)' }}>{m.first_name} {m.last_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{m.email}</p>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--muted)' }}>No registrations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Site settings */}
        <div id="settings" style={{ marginTop: 48 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Site settings</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Hero image and data sync sources.</p>
          </div>
          <SettingsClient initial={{
            hero_image_url:         settings?.hero_image_url         ?? null,
            sync_thursday_sheet:    settings?.sync_thursday_sheet    ?? true,
            sync_social_sheet:      settings?.sync_social_sheet      ?? true,
            show_social_calendar:   settings?.show_social_calendar   ?? false,
            email_default_subject:  settings?.email_default_subject  ?? null,
            email_default_opening:  settings?.email_default_opening  ?? null,
            email_default_closing:  settings?.email_default_closing  ?? null,
            c25k_enabled:             settings?.c25k_enabled             ?? false,
            c25k_registration_open:   settings?.c25k_registration_open   ?? false,
            c25k_start_date:          settings?.c25k_start_date          ?? null,
            c25k_cohort_label:        settings?.c25k_cohort_label        ?? null,
            c25k_max_registrations:   settings?.c25k_max_registrations   ?? null,
            c25k_session_order:       settings?.c25k_session_order       ?? null,
          }} />
        </div>

      </main>
    </AdminShell>
  )
}
