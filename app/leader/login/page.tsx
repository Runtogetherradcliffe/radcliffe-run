'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LeaderLoginPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/leader`,
        shouldCreateUser: false, // only allow existing members
      },
    })

    if (error) {
      setError('Could not send login link — check your email address is registered.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0a0a', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', fontFamily: 'Inter, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
          radcliffe<span style={{ color: '#f5a623' }}>.run</span>
        </p>
        <p style={{ fontSize: 12, color: '#555', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Run leader access
        </p>
      </div>

      <div style={{
        width: '100%', maxWidth: 380, background: '#111',
        border: '1px solid #1e1e1e', borderRadius: 14, padding: '28px 24px',
      }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Check your email</p>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
              We&apos;ve sent a login link to <strong style={{ color: '#aaa' }}>{email}</strong>.
              Tap it to open the emergency contact lookup.
            </p>
            <p style={{ fontSize: 12, color: '#444', marginTop: 16 }}>
              Link expires in 1 hour. Check your spam folder if it doesn&apos;t arrive.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Run leader sign in</p>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
              Enter your registered email address and we&apos;ll send you a one-tap login link.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a',
                  borderRadius: 8, padding: '12px 14px', fontSize: 15, color: '#fff',
                  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
                  marginBottom: 16,
                }}
              />
              {error && (
                <p style={{ fontSize: 13, color: '#e05c5c', marginBottom: 12 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: '#f5a623', color: '#0a0a0a',
                  border: 'none', borderRadius: 8, padding: '13px 20px',
                  fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif',
                }}
              >
                {loading ? 'Sending…' : 'Send login link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
