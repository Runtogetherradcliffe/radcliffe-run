'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const INPUT_STYLE = {
  width: '100%', background: '#0a0a0a', border: '1px solid #222',
  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
}

const BTN_STYLE = (disabled: boolean) => ({
  background: disabled ? '#1a1a1a' : '#f5a623',
  color: disabled ? '#333' : '#0a0a0a',
  fontSize: 14, fontWeight: 700, padding: '12px 24px',
  borderRadius: 8, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
  width: '100%',
})

export default function SignInPage() {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [step,    setStep]    = useState<'email' | 'code'>('email')
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  // ── Step 1: send OTP code ────────────────────────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const normalised = email.trim().toLowerCase()

    // Server-side membership check
    let found = false
    try {
      const res  = await fetch('/api/check-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalised }),
      })
      const data = await res.json()
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

    // Send 6-digit OTP (no emailRedirectTo = code-based flow, stays in the app)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: normalised,
      options: { shouldCreateUser: true },
    })

    if (error) {
      setError(error.message || 'Something went wrong — please try again.')
    } else {
      setStep('code')
      setTimeout(() => codeRef.current?.focus(), 100)
    }
    setLoading(false)
  }

  // ── Step 2: verify code ──────────────────────────────────────────────────
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })

    if (error) {
      setError('Invalid or expired code — check your email and try again.')
    } else {
      router.push('/profile')
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

          {step === 'email' ? (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign in</h1>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>
                Enter your registered email and we&apos;ll send you a 6-digit code. No password needed.
              </p>

              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    style={INPUT_STYLE}
                  />
                </div>

                {error && <ErrorBox error={error} showRegister />}

                <button type="submit" disabled={loading || !email} style={BTN_STYLE(loading || !email)}>
                  {loading ? 'Sending…' : 'Send code'}
                </button>
              </form>

              <p style={{ fontSize: 13, color: '#444', marginTop: 20, textAlign: 'center' }}>
                Not registered yet?{' '}
                <Link href="/join" style={{ color: '#f5a623', textDecoration: 'none' }}>Join for free →</Link>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Enter your code</h1>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>
                We&apos;ve sent a 6-digit code to <strong style={{ color: '#ccc' }}>{email}</strong>.
                Enter it below — check your spam if it doesn&apos;t arrive.
              </p>

              <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>
                    6-digit code
                  </label>
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    style={{ ...INPUT_STYLE, fontSize: 24, letterSpacing: '0.2em', textAlign: 'center' }}
                  />
                </div>

                {error && <ErrorBox error={error} />}

                <button type="submit" disabled={loading || code.length < 6} style={BTN_STYLE(loading || code.length < 6)}>
                  {loading ? 'Verifying…' : 'Sign in'}
                </button>
              </form>

              <p style={{ fontSize: 13, color: '#444', marginTop: 20, textAlign: 'center' }}>
                Wrong email?{' '}
                <button
                  onClick={() => { setStep('email'); setCode(''); setError(null) }}
                  style={{ background: 'none', border: 'none', color: '#f5a623', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
                >
                  Go back
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ error, showRegister }: { error: string; showRegister?: boolean }) {
  return (
    <div style={{ background: '#1a0a0a', border: '1px solid #3a1a1a', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontSize: 13, color: '#e05252' }}>⚠️ {error}</p>
      {showRegister && (
        <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          <Link href="/join" style={{ color: '#f5a623', textDecoration: 'none' }}>Register here →</Link>
        </p>
      )}
    </div>
  )
}
