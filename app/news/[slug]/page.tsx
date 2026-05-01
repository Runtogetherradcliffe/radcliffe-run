import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import PhotoGallery from './PhotoGallery'
import RoundupBody from './RoundupBody'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

const TYPE_LABEL: Record<string, string> = { roundup: 'Weekly roundup', news: 'News' }
const TYPE_COLOR: Record<string, string> = { roundup: '#f5a623', news: '#6b9fd4' }

/** Plain-text fallback renderer for news posts */
function PlainBody({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  return (
    <div>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ fontSize: 15, color: '#bbb', lineHeight: 1.85, marginBottom: 20 }}>
          {para}
        </p>
      ))}
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: post } = await supabaseAdmin()
    .from('posts')
    .select('title, summary, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) return {}

  const title = `${post.title} — radcliffe.run`
  const description = post.summary ?? undefined

  return {
    title,
    description,
    openGraph: { title, description, type: 'article', publishedTime: post.published_at ?? undefined },
    twitter: { card: 'summary', title, description },
  }
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
    const { data } = await supabaseAdmin()
      .from('posts')
      .select('*')
      .eq('id', slug)
      .eq('status', 'published')
      .maybeSingle()
    post = data
  }

  if (!post) notFound()

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
          <header style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accentColor }}>
                {TYPE_LABEL[post.type] ?? post.type}
              </span>
              {post.published_at && (
                <>
                  <span style={{ fontSize: 11, color: '#333' }}>·</span>
                  <span style={{ fontSize: 11, color: '#555' }}>{fmtDate(post.published_at)}</span>
                </>
              )}
            </div>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 0 }}>
              {post.title}
            </h1>
            {post.summary && (
              <p style={{ fontSize: 15, color: '#666', marginTop: 12, lineHeight: 1.6 }}>
                {post.summary}
              </p>
            )}
          </header>

          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid #1a1a1a', marginBottom: 36 }} />

          {/* Photo gallery */}
          {post.photo_urls?.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <PhotoGallery urls={post.photo_urls} />
            </div>
          )}

          {/* Body — roundups get the styled card renderer, news gets plain paragraphs */}
          {post.type === 'roundup'
            ? <RoundupBody content={post.content ?? ''} />
            : <PlainBody content={post.content ?? ''} />
          }

          {/* Footer */}
          <div style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid #1a1a1a' }}>
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
