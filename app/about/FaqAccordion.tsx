'use client'
import { useState } from 'react'
import { FAQS } from './faqs'


export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {FAQS.map((faq, i) => {
        const isOpen = open === i
        return (
          <div key={i} style={{
            background: isOpen ? 'var(--card-hi)' : 'transparent',
            border: `1px solid ${isOpen ? 'var(--border-2)' : 'var(--border)'}`,
            borderRadius: 10,
            overflow: 'hidden',
            transition: 'background 0.2s, border-color 0.2s',
          }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', padding: '18px 20px', fontFamily: 'Inter, sans-serif',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
              }}
            >
              <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: isOpen ? 'var(--white)' : 'var(--dim)', lineHeight: 1.4 }}>
                {faq.q}
              </span>
              <span style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                background: isOpen ? '#f5a623' : 'var(--card-hi)',
                border: `1px solid ${isOpen ? '#f5a623' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--text-base)', color: isOpen ? '#0a0a0a' : 'var(--muted)',
                transition: 'all 0.2s',
                transform: isOpen ? 'rotate(45deg)' : 'none',
              }}>
                +
              </span>
            </button>
            {/* Always in the server HTML (hidden via CSS when closed) so search
                engines and AI crawlers can read the answers without clicking. */}
            <div style={{ padding: '0 20px 18px', display: isOpen ? 'block' : 'none' }}>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--muted)', lineHeight: 1.8 }}>{faq.a}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
