import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import PhotoGallery from './PhotoGallery'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

const TYPE_LABEL: Record<string, string> = { roundup: 'Weekly roundup', news: 'News' }
const TYPE_COLOR: Record<string, string> = { roundup: '#f5a623', news: '#6b9fd4' }

/** Render plain-text content as paragraphs */
function renderContent(text: string) {
  return text
    .split(/\n\n+/)
    .map(para => para.trim())
    .filter(Boolean)
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Try slug first, fall back to id (for posts created before slug trigger)
  let { data: post } = await supabaseAdmin()
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) {
    // Try by id in case the slug IS the id
    const { data } = await supabaseAdmin()
      .from('posts')
      .select('*')
      .eq('id', slug)
      .eq('status', 'published')
      .maybeSingle()
    post = data
  }

  if (!post) notFound()

  const paragraphs = renderContent(post.content ?? '')
  const accentColor = TYPE_COLOR[post.type] ?? '#f5a623'

  return (
    <>
      <Nav />
      <main style={{ minHeight: '100vh' }}>
        <article style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>

          {/* Back */}
          <Link href="/news" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', textDecoration: 'none', marginBottom: 40 }}>
            ← All posts
          </Link>

          {/* Header */}
          <header style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>
                {TYPE_LABEL[post.type] ?? post.type}
              </span>
              {post.published_at && (
                <>
                  <span style={{ fontSize: 11, color: '#333' }}>·</span>
                  <span style={{ fontSize: 11, color: '#555' }}>{fmtDate(post.published_at)}</span>
                </>
              )}
            </div>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 0 }}>
              {post.title}
            </h1>
            {post.summary && (
              <p style={{ fontSize: 16, color: '#888', marginTop: 12, lineHeight: 1.6 }}>
                {post.summary}
              </p>
            )}
          </header>

          {/* Photo gallery — shown before body if photos exist */}
          {post.photo_urls?.length > 0 && (
            <PhotoGallery urls={post.photo_urls} />
          )}

          {/* Body */}
          <div style={{ marginTop: post.photo_urls?.length > 0 ? 32 : 0 }}>
            {paragraphs.map((para, i) => (
              <p key={i} style={{ fontSize: 15, color: '#bbb', lineHeight: 1.85, marginBottom: 20 }}>
                {para}
              </p>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 48, paddingTop: 28, borderTop: '1px solid #1a1a1a' }}>
            <Link
              href="/news"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#888', background: '#111', border: '1px solid #1e1e1e', padding: '10px 18px', borderRadius: 8, textDecoration: 'none' }}
            >
              ← All posts
            </Link>
          </div>

        </article>
      </main>
      <Footer />
    </>
  )
}
