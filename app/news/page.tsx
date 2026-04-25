import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'

export const metadata = { title: 'Latest from RTR — radcliffe.run' }
export const dynamic = 'force-dynamic'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

const TYPE_LABEL: Record<string, string> = { roundup: 'Weekly roundup', news: 'News' }
const TYPE_COLOR: Record<string, string> = { roundup: '#f5a623', news: '#6b9fd4' }

export default async function NewsPage() {
  const { data: posts } = await supabaseAdmin()
    .from('posts')
    .select('id, type, title, summary, slug, published_at, photo_urls')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(40)

  const grouped: Record<string, typeof posts> = {}
  for (const p of posts ?? []) {
    const year = p.published_at ? p.published_at.slice(0, 4) : 'Undated'
    if (!grouped[year]) grouped[year] = []
    grouped[year]!.push(p)
  }
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a))

  return (
    <>
      <Nav />
      <main style={{ minHeight: '100vh' }}>
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>
              Run Together Radcliffe
            </p>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Latest from RTR
            </h1>
          </div>

          {(posts ?? []).length === 0 ? (
            <p style={{ color: '#555', fontSize: 15 }}>Nothing published yet — check back soon.</p>
          ) : (
            years.map(year => (
              <section key={year} style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333', marginBottom: 16 }}>{year}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {grouped[year]!.map(post => (
                    <Link
                      key={post.id}
                      href={`/news/${post.slug ?? post.id}`}
                      style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        gap: 16, padding: '14px 0', textDecoration: 'none',
                        borderBottom: '1px solid #161616',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TYPE_COLOR[post.type] ?? '#888' }}>
                            {TYPE_LABEL[post.type] ?? post.type}
                          </span>
                          {post.photo_urls?.length > 0 && (
                            <span style={{ fontSize: 10, color: '#444' }}>📷 {post.photo_urls.length}</span>
                          )}
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#ddd', marginBottom: post.summary ? 4 : 0, lineHeight: 1.3 }}>
                          {post.title}
                        </p>
                        {post.summary && (
                          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.summary}
                          </p>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <p style={{ fontSize: 12, color: '#444', whiteSpace: 'nowrap' }}>
                          {fmtDate(post.published_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}

        </section>
      </main>
      <Footer />
    </>
  )
}
