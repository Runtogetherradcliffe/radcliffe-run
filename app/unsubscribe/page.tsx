import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

export const metadata = { title: 'Unsubscribed — radcliffe.run' }

/** Verify the HMAC token from the unsubscribe URL */
function verifyToken(memberId: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) return false
  try {
    const expected = createHmac('sha256', secret).update(memberId).digest()
    const provided  = Buffer.from(token, 'hex')
    if (expected.length !== provided.length) return false
    return timingSafeEqual(expected, provided)
  } catch {
    return false
  }
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>
}) {
  const { id, token } = await searchParams

  let status: 'ok' | 'already' | 'invalid' | 'error' = 'invalid'

  if (id && token && verifyToken(id, token)) {
    // Token verified — safe to look up and act
    const { data: member } = await supabaseAdmin()
      .from('members')
      .select('email_opt_out')
      .eq('id', id)
      .single()

    if (!member) {
      status = 'invalid'
    } else if (member.email_opt_out) {
      status = 'already'
    } else {
      const { error } = await supabaseAdmin()
        .from('members')
        .update({ email_opt_out: true })
        .eq('id', id)
      status = error ? 'error' : 'ok'
    }
  }

  return (
    <>
      <Nav />
      <main style={{
        maxWidth: 560, margin: '0 auto', padding: '80px 24px',
        fontFamily: 'Inter, sans-serif', textAlign: 'center',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 48 }}>
            <span style={{ color: 'var(--white)' }}>radcliffe.</span>
            <span style={{ color: '#f5a623' }}>run</span>
          </p>
        </Link>

        {status === 'ok' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 20 }}>✓</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
              You&apos;ve been unsubscribed
            </h1>
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
              You won&apos;t receive any more club emails from radcliffe.run.
              You can re-enable them anytime from your profile.
            </p>
            <Link
              href="/profile"
              style={{
                display: 'inline-block', padding: '10px 24px', borderRadius: 8,
                background: '#f5a623', color: '#0a0a0a', fontSize: 'var(--text-base)',
                fontWeight: 700, textDecoration: 'none',
              }}
            >
              Manage preferences →
            </Link>
          </>
        )}

        {status === 'already' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 20 }}>✓</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Already unsubscribed
            </h1>
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
              You&apos;re already opted out of club emails. You can manage your
              preferences from your profile.
            </p>
            <Link href="/profile" style={{ color: '#f5a623', textDecoration: 'none', fontSize: 'var(--text-base)' }}>
              Go to profile →
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 20 }}>⚠️</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Invalid link
            </h1>
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
              This unsubscribe link isn&apos;t valid. If you&apos;d like to opt out,
              sign in to manage your preferences.
            </p>
            <Link href="/signin" style={{ color: '#f5a623', textDecoration: 'none', fontSize: 'var(--text-base)' }}>
              Sign in →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 20 }}>⚠️</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
              We couldn&apos;t process your request. Please try again or sign in
              to manage your preferences.
            </p>
            <Link href="/signin" style={{ color: '#f5a623', textDecoration: 'none', fontSize: 'var(--text-base)' }}>
              Sign in →
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
