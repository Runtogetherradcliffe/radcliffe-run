import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Preview — radcliffe.run', robots: 'noindex' }

const PREVIEW_COOKIE = 'rtr-preview'

export default async function PreviewLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next = '/', error } = await searchParams

  async function submit(formData: FormData) {
    'use server'
    const password = formData.get('password') as string
    const nextPath = formData.get('next') as string

    if (password === process.env.PREVIEW_PASSWORD) {
      const cookieStore = await cookies()
      cookieStore.set(PREVIEW_COOKIE, password, {
        httpOnly: true,
        sameSite: 'lax',
        // No maxAge = session cookie; add maxAge: 60*60*24*30 for 30-day persistence
        path: '/',
      })
      redirect(nextPath || '/')
    } else {
      redirect(`/preview-login?next=${encodeURIComponent(nextPath)}&error=1`)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 24px' }}>

        {/* Wordmark */}
        <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 32 }}>
          radcliffe.<span style={{ color: '#f5a623' }}>run</span>
        </p>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 28px' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 6 }}>Preview access</p>
          <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 24 }}>Enter password</p>

          <form action={submit}>
            <input type="hidden" name="next" value={next} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoFocus
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg)', border: `1px solid ${error ? '#c0392b' : '#2a2a2a'}`,
                borderRadius: 8, padding: '12px 14px', fontSize: 'var(--text-md)', color: 'var(--white)',
                fontFamily: 'inherit', outline: 'none', marginBottom: error ? 8 : 20,
              }}
            />
            {error && (
              <p style={{ fontSize: 'var(--text-sm)', color: '#c0392b', marginBottom: 16 }}>Incorrect password — try again.</p>
            )}
            <button type="submit" style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: '#f5a623', color: '#0a0a0a', fontSize: 'var(--text-base)', fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.01em',
            }}>
              Enter site
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 20 }}>
          This site is in preview — not yet public.
        </p>
      </div>
    </div>
  )
}
