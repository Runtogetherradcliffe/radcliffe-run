'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/layout/Nav'
import Link from 'next/link'

type Session = 'tuesday' | 'thursday' | 'both' | ''

export default function C25KJoinPage() {
  const [session, setSession] = useState<Session>('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const router = useRouter()

  async function handleJoin() {
    if (!session) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/c25k/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      router.push('/c25k/programme')
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '16px 20px', borderRadius: 12, cursor: 'pointer',
    border: active ? '2px solid #f5a623' : '2px solid #222',
    background: active ? 'rgba(245,166,35,0.08)' : 'var(--card)',
    color: active ? '#f5a623' : '#aaa',
    fontSize: 'var(--text-md)', fontWeight: 700, fontFamily: 'Inter, sans-serif',
    textAlign: 'center', transition: 'all 0.15s',
  })

  return (
    <>
      <Nav />
      <main style={{
        background: 'var(--bg)', minHeight: 'calc(100vh - 60px)',
        fontFamily: 'Inter, sans-serif', color: 'var(--white)',
        padding: 'clamp(48px, 8vw, 80px) clamp(20px, 5vw, 64px)',
        display: 'flex', alignItems: 'flex-start',
      }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ marginBottom: 40 }}>
            <Link href="/c25k" style={{ fontSize: 'var(--text-sm)', color: '#f5a623', textDecoration: 'none' }}>← Back to Couch to 5K</Link>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)',
            borderRadius: 99, padding: '6px 14px', marginBottom: 28,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5a623' }} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f5a623' }}>
              Already registered
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800,
            letterSpacing: '-0.03em', margin: '0 0 16px',
          }}>
            Join the programme
          </h1>
          <p style={{ fontSize: 'var(--text-md)', fontWeight: 300, color: 'var(--dim)', lineHeight: 1.7, margin: '0 0 40px' }}>
            We already have your details from your existing registration - just let us know which sessions you plan to come to.
          </p>

          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
            Which sessions can you make?
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
            {([
              { value: 'tuesday',  label: 'Tuesday' },
              { value: 'thursday', label: 'Thursday' },
              { value: 'both',     label: 'Both' },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setSession(opt.value)} style={btnStyle(session === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>

          {session && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 28,
            }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: 'var(--dim)', margin: 0, lineHeight: 1.6 }}>
                {session === 'tuesday'  && 'You\'ll be joining the Tuesday group - 7pm at Aldi, Higher Lane, Whitefield.'}
                {session === 'thursday' && 'You\'ll be joining the Thursday group - 7pm at Radcliffe Market, Blackburn Street.'}
                {session === 'both'     && 'You\'ll be joining both group sessions - Tuesdays in Whitefield and Thursdays in Radcliffe, both at 7pm.'}
              </p>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={!session || saving}
            style={{
              width: '100%', background: session ? '#f5a623' : '#1a1a1a',
              color: session ? '#0a0a0a' : '#444', border: 'none',
              borderRadius: 12, padding: '15px 24px',
              fontSize: 'var(--text-md)', fontWeight: 700, cursor: session && !saving ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
            }}
          >
            {saving ? 'Joining…' : 'Join programme →'}
          </button>

          {error && (
            <p style={{ fontSize: 'var(--text-sm)', color: '#e05c5c', marginTop: 16 }}>{error}</p>
          )}
        </div>
      </main>
    </>
  )
}
