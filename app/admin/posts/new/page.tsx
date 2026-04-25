import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminShell from '@/components/AdminShell'
import PostEditor from '../PostEditor'

export const metadata = { title: 'New post — radcliffe.run admin' }

export default async function NewPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const today = new Date().toISOString().slice(0, 10)

  const initial = {
    type: 'roundup' as const,
    status: 'draft' as const,
    title: '',
    summary: '',
    content: '',
    photo_urls: [],
    published_at: today,
  }

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32 }}>
        <div style={{ maxWidth: 800 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Posts</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 32 }}>New post</h1>
          <PostEditor initial={initial} isNew={true} />
        </div>
      </main>
    </AdminShell>
  )
}
