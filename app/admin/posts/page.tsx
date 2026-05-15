import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Posts — radcliffe.run admin' }
export const dynamic = 'force-dynamic'

const STATUS_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#1a1a1a', color: 'var(--muted)',    label: 'Draft' },
  published: { bg: '#0a1a0a', color: '#7cb87c', label: 'Published' },
  archived:  { bg: '#1a0d00', color: '#b06830', label: 'Archived' },
}

const TYPE_LABEL: Record<string, string> = {
  roundup: 'Roundup',
  news: 'News',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default async function AdminPostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: posts } = await supabaseAdmin()
    .from('posts')
    .select('id, type, status, title, summary, slug, published_at, created_at, photo_urls')
    .order('created_at', { ascending: false })

  const active   = (posts ?? []).filter(p => p.status !== 'archived')
  const archived = (posts ?? []).filter(p => p.status === 'archived')

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32, maxWidth: 900 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Posts</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Roundups &amp; news</h1>
          </div>
          <Link href="/admin/posts/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f5a623', color: '#0a0a0a',
            fontSize: 'var(--text-sm)', fontWeight: 700, padding: '10px 18px',
            borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            + New post
          </Link>
        </div>

        {/* Active posts */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--dim)', marginBottom: 12 }}>All posts</h2>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {active.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-base)' }}>No posts yet.</p>
                <Link href="/admin/posts/new" style={{ fontSize: 'var(--text-sm)', color: '#f5a623', textDecoration: 'none' }}>Write your first post →</Link>
              </div>
            ) : active.map((p, i) => {
              const chip = STATUS_CHIP[p.status] ?? STATUS_CHIP.draft
              return (
                <Link key={p.id} href={`/admin/posts/${p.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', textDecoration: 'none', gap: 16,
                  borderBottom: i < active.length - 1 ? '1px solid #1a1a1a' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: p.type === 'roundup' ? '#f5a623' : '#6b9fd4' }}>
                        {TYPE_LABEL[p.type] ?? p.type}
                      </span>
                      {p.photo_urls?.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--faint)' }}>📷 {p.photo_urls.length}</span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--white)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {p.published_at ? `Published ${fmtDate(p.published_at)}` : `Created ${fmtDate(p.created_at)}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: chip.bg, color: chip.color, border: `1px solid ${chip.color}33` }}>
                      {chip.label}
                    </span>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Archived */}
        {archived.length > 0 && (
          <section>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--faint)', marginBottom: 12 }}>Archived</h2>
            <div style={{ background: '#0d0d0d', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {archived.map((p, i) => {
                const chip = STATUS_CHIP.archived
                return (
                  <Link key={p.id} href={`/admin/posts/${p.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', textDecoration: 'none', gap: 16,
                    borderBottom: i < archived.length - 1 ? '1px solid #181818' : 'none',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--faint)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {p.published_at ? fmtDate(p.published_at) : '—'}
                      </p>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: chip.bg, color: chip.color, border: `1px solid ${chip.color}33` }}>
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
