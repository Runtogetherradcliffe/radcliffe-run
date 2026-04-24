import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Emails — radcliffe.run admin' }
export const dynamic = 'force-dynamic'

const STATUS_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#1a1a1a', color: '#888',    label: 'Draft' },
  scheduled: { bg: '#0d1a2a', color: '#6b9fd4', label: 'Scheduled' },
  sent:      { bg: '#0a1a0a', color: '#7cb87c', label: 'Sent' },
  cancelled: { bg: '#1a0a0a', color: '#e05252', label: 'Cancelled' },
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function fmtDatetime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default async function AdminEmailsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: emails } = await supabaseAdmin()
    .from('scheduled_emails')
    .select('*')
    .order('created_at', { ascending: false })

  const upcoming = (emails ?? []).filter(e => e.status !== 'sent' && e.status !== 'cancelled')
  const past     = (emails ?? []).filter(e => e.status === 'sent' || e.status === 'cancelled')

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32, maxWidth: 900 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Emails</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Member emails</h1>
          </div>
          <Link href="/admin/emails/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f5a623', color: '#0a0a0a',
            fontSize: 13, fontWeight: 700, padding: '10px 18px',
            borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            + Compose email
          </Link>
        </div>

        {/* Upcoming / drafts */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ccc', marginBottom: 12 }}>Drafts &amp; scheduled</h2>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
            {upcoming.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ color: '#555', fontSize: 14 }}>No drafts yet.</p>
                <Link href="/admin/emails/new" style={{ fontSize: 13, color: '#f5a623', textDecoration: 'none' }}>Compose your first email →</Link>
              </div>
            ) : upcoming.map((e, i) => {
              const chip = STATUS_CHIP[e.status] ?? STATUS_CHIP.draft
              return (
                <Link key={e.id} href={`/admin/emails/${e.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', textDecoration: 'none', gap: 16,
                  borderBottom: i < upcoming.length - 1 ? '1px solid #1a1a1a' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.subject || '(no subject)'}
                    </p>
                    <p style={{ fontSize: 12, color: '#555' }}>
                      {e.thursday_date ? `For Thursday ${fmtDate(e.thursday_date)}` : 'No run attached'}
                      {e.scheduled_for ? ` · Send ${fmtDatetime(e.scheduled_for)}` : ' · No send time set'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: chip.bg, color: chip.color, border: `1px solid ${chip.color}33` }}>
                      {chip.label}
                    </span>
                    <span style={{ fontSize: 13, color: '#333' }}>→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Sent emails */}
        {past.length > 0 && (
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ccc', marginBottom: 12 }}>Sent</h2>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              {past.map((e, i) => {
                const chip = STATUS_CHIP[e.status] ?? STATUS_CHIP.sent
                return (
                  <Link key={e.id} href={`/admin/emails/${e.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', textDecoration: 'none', gap: 16,
                    borderBottom: i < past.length - 1 ? '1px solid #1a1a1a' : 'none',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.subject || '(no subject)'}
                      </p>
                      <p style={{ fontSize: 12, color: '#444' }}>
                        {e.sent_at ? `Sent ${fmtDatetime(e.sent_at)}` : fmtDate(e.thursday_date)}
                        {e.recipient_count ? ` · ${e.recipient_count} recipients` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: chip.bg, color: chip.color, border: `1px solid ${chip.color}33` }}>
                      {chip.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </main>
    </AdminShell>
  )
}
