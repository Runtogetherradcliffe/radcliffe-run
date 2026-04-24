'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LeaderLoginPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/leader`,
        shouldCreateUser: false,
      },
    })

    if (error) {
      setError('Could not send login link — check your email address is registered with RTR.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <p style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
          <span style={{ color: '#fff' }}>radcliffe.</span><span style={{ color: '#f5a623' }}>run</span>
        </p>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 36 }}>
          Run leader access
        </p>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: 36 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Check your email</h1>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7 }}>
                We&apos;ve sent a login link to <strong style={{ color: '#ccc' }}>{email}</strong>. Tap it to open the emergency contact lookup.
              </p>
              <p style={{ fontSize: 12, color: '#555', marginTop: 16 }}>
                The link expires in 1 hour. Check your spam if it doesn&apos;t arrive.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Run leader sign in</h1>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>
                Enter your registered email and we&apos;ll send you a one-tap login link.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      width: '100%', background: '#0a0a0a', border: '1px solid #222',
                      borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
                      fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: '#e05252' }}>⚠️ {error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    background: loading || !email ? '#1a1a1a' : '#f5a623',
                    color: loading || !email ? '#333' : '#0a0a0a',
                    fontSize: 14, fontWeight: 700, padding: '12px 24px',
                    borderRadius: 8, border: 'none',
                    cursor: loading || !email ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Sending…' : 'Send login link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
