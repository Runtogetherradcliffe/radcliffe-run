'use client'

import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false)

  function retry() {
    setRetrying(true)
    window.location.href = '/'
  }

  // Auto-retry when connection returns
  useEffect(() => {
    function handleOnline() { window.location.href = '/' }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, sans-serif',
      padding: '0 24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>

        {/* Wordmark */}
        <p style={{
          fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
          marginBottom: 48, color: '#fff',
        }}>
          radcliffe.<span style={{ color: '#f5a623' }}>run</span>
        </p>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#111', border: '1px solid #1e1e1e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          fontSize: 32,
        }}>
          📵
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em',
          color: '#fff', marginBottom: 12,
        }}>
          You&apos;re offline
        </h1>

        <p style={{
          fontSize: 16, color: '#666', lineHeight: 1.7, marginBottom: 36,
        }}>
          No internet connection right now. Check your signal and try again —
          we&apos;ll take you straight back to the site when you&apos;re reconnected.
        </p>

        <button
          onClick={retry}
          disabled={retrying}
          style={{
            padding: '13px 32px',
            background: '#f5a623',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
            cursor: retrying ? 'default' : 'pointer',
            opacity: retrying ? 0.7 : 1,
          }}
        >
          {retrying ? 'Trying…' : 'Try again'}
        </button>

        <p style={{ fontSize: 13, color: '#333', marginTop: 32 }}>
          Pages you&apos;ve visited recently may still be available below.
        </p>

      </div>
    </div>
  )
}
