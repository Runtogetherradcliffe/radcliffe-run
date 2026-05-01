'use client'

import { useRouter } from 'next/navigation'

export default function BackLink() {
  const router = useRouter()

  function handleBack() {
    // If there's browser history, go back — otherwise fall back to the join form
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/join')
    }
  }

  return (
    <button
      onClick={handleBack}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: '#555', background: 'none', border: 'none',
        cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif',
        marginBottom: 40,
      }}
    >
      ← Back
    </button>
  )
}
