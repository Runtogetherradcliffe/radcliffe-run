import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import AdminShell from '@/components/AdminShell'
import PostEditor from '../PostEditor'

export const metadata = { title: 'Edit post — radcliffe.run admin' }
export const dynamic = 'force-dynamic'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: post } = await supabaseAdmin()
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!post) notFound()

  const initial = {
    id: post.id,
    type: post.type,
    status: post.status,
    title: post.title,
    summary: post.summary ?? '',
    content: post.content ?? '',
    photo_urls: post.photo_urls ?? [],
    published_at: post.published_at ?? null,
  }

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32 }}>
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623' }}>Posts</p>
            {post.published_at && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)' }}>{fmtDate(post.published_at)}</p>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 32, color: 'var(--dim)' }}>
            {post.title || 'Untitled'}
          </h1>
          <PostEditor initial={initial} isNew={false} />
        </div>
      </main>
    </AdminShell>
  )
}
