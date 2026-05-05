'use client'
import { useState } from 'react'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'

export default function ContactPage() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState('')
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    })
    setStatus(res.ok ? 'sent' : 'error')
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 8,
    background: '#111', border: '1px solid #1e1e1e',
    color: '#fff', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    color: '#555', marginBottom: 8,
  }

  return (
    <>
      <Nav />
      <main>
        <section style={{ maxWidth: 560, margin: '0 auto', padding: '56px 24px 80px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 12 }}>Get in touch</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12 }}>Contact us</h1>
          <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7, marginBottom: 40 }}>
            Have a question or want to know more? Drop us a message and we'll get back to you.
          </p>

          {status === 'sent' ? (
            <div style={{ background: '#0d2a0d', border: '1px solid #1a3a1a', borderRadius: 12, padding: '32px 28px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Message sent!</p>
              <p style={{ fontSize: 15, color: '#888' }}>Thanks {name.split(' ')[0]} — we'll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Your name</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith" style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com" style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  required value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="What would you like to know?" rows={6}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              {status === 'error' && (
                <p style={{ fontSize: 14, color: '#e05c5c' }}>Something went wrong — please try again or email us directly at hello@radcliffe.run.</p>
              )}
              <button
                type="submit" disabled={status === 'sending'}
                style={{
                  padding: '14px 32px', borderRadius: 8, border: 'none', cursor: status === 'sending' ? 'default' : 'pointer',
                  background: status === 'sending' ? '#555' : '#f5a623',
                  color: '#0a0a0a', fontSize: 15, fontWeight: 700,
                  fontFamily: 'inherit', alignSelf: 'flex-start',
                }}
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
