'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function SignInPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const normalised = email.trim().toLowerCase()

    // Server-side membership check first
    let found = false
    try {
      const check = await fetch('/api/check-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalised }),
      })
      const data = await check.json()
      found = data.found ?? false
    } catch {
      setError('Something went wrong — please try again.')
      setLoading(false)
      return
    }

    if (!found) {
      setError('No account found for that email — have you registered yet?')
      setLoading(false)
      return
    }

    // Member confirmed — send magic link (shouldCreateUser: true so first-time
    // sign-ins work for members who don't yet have a Supabase auth account)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: normalised,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile`,
        shouldCreateUser: true,
      },
    })

    if (error) {
      setError(error.message || 'Something went wrong — please try again.')
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

        <Link href="/" style={{ textDecoration: 'none' }}>
          <p style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 36 }}>
            <span style={{ color: '#fff' }}>radcliffe.</span><span style={{ color: '#f5a623' }}>run</span>
          </p>
        </Link>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: 36 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Check your email</h1>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7 }}>
                We&apos;ve sent a sign-in link to <strong style={{ color: '#ccc' }}>{email}</strong>.
                Tap it to access your profile.
              </p>
              <p style={{ fontSize: 12, color: '#555', marginTop: 16 }}>
                Link expires in 1 hour. Check your spam if it doesn&apos;t arrive.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign in</h1>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>
                Enter your registered email and we&apos;ll send you a one-tap sign-in link. No password needed.
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
                  <div style={{ background: '#1a0a0a', border: '1px solid #3a1a1a', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontSize: 13, color: '#e05252' }}>⚠️ {error}</p>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      <Link href="/join" style={{ color: '#f5a623', textDecoration: 'none' }}>Register here →</Link>
                    </p>
                  </div>
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
                  {loading ? 'Sending…' : 'Send sign-in link'}
                </button>
              </form>

              <p style={{ fontSize: 13, color: '#444', marginTop: 20, textAlign: 'center' }}>
                Not registered yet?{' '}
                <Link href="/join" style={{ color: '#f5a623', textDecoration: 'none' }}>Join for free →</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
