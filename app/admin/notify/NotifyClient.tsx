'use client'

import { useState } from 'react'

const PRESETS = [
  {
    label: 'Thursday reminder',
    title: "Thursday run tonight 🏃",
    body: "Meet at Radcliffe Market at 7pm. Check the website for tonight's route.",
    url: '/',
  },
  {
    label: 'New roundup',
    title: "Weekend roundup is up",
    body: "Check out this week's parkrun results and race highlights.",
    url: '/roundup',
  },
  {
    label: 'Cancellation',
    title: "Tonight's run is cancelled",
    body: "Due to weather conditions, tonight's run has been cancelled. See you next week!",
    url: '/',
  },
]

export default function NotifyClient({ subscriberCount }: { subscriberCount: number }) {
  const [title, setTitle]   = useState('')
  const [body,  setBody]    = useState('')
  const [url,   setUrl]     = useState('/')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  function applyPreset(preset: typeof PRESETS[0]) {
    setTitle(preset.title)
    setBody(preset.body)
    setUrl(preset.url)
    setResult(null)
    setError(null)
  }

  async function send() {
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || '/' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      setResult(data)
      setTitle('')
      setBody('')
      setUrl('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#0a0a0a', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#fff',
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#555',
    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'block',
  }

  return (
    <div>
      {/* Presets */}
      <div style={{ marginBottom: 28 }}>
        <p style={labelStyle}>Quick presets</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)} style={{
              padding: '7px 14px', borderRadius: 7, border: '1px solid #2a2a2a',
              background: '#111', color: '#aaa', fontSize: 13, fontFamily: 'inherit',
              cursor: 'pointer', fontWeight: 500,
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tonight's run is on!"
            maxLength={100}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Message</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Meet at Radcliffe Market at 7pm…"
            maxLength={200}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
          <p style={{ fontSize: 12, color: '#333', marginTop: 6 }}>{body.length}/200 characters</p>
        </div>

        <div>
          <label style={labelStyle}>Link (optional)</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/"
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: '#444', marginTop: 6 }}>
            Where tapping the notification goes. Use / for homepage, /roundup for the latest roundup.
          </p>
        </div>

        {/* Result / error */}
        {result && (
          <div style={{ background: '#0d2a0d', border: '1px solid #1a3d1a', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ fontSize: 14, color: '#4caf76', fontWeight: 600 }}>
              Sent to {result.sent} of {result.total} subscriber{result.total !== 1 ? 's' : ''}
              {result.failed > 0 ? ` (${result.failed} failed — expired subscriptions removed)` : ''}
            </p>
          </div>
        )}
        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #3d1a1a', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ fontSize: 14, color: '#cf6679' }}>Error: {error}</p>
          </div>
        )}

        <button
          onClick={send}
          disabled={sending || !title.trim() || !body.trim() || subscriberCount === 0}
          style={{
            padding: '13px', borderRadius: 8, border: 'none',
            background: subscriberCount === 0 ? '#1a1a1a' : '#f5a623',
            color: subscriberCount === 0 ? '#444' : '#0a0a0a',
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            cursor: sending || !title.trim() || !body.trim() || subscriberCount === 0 ? 'default' : 'pointer',
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending
            ? 'Sending…'
            : subscriberCount === 0
              ? 'No subscribers yet'
              : `Send to ${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
