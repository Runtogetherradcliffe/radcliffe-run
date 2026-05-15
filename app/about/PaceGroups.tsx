'use client'
import { useState } from 'react'
import { RUN_GROUPS } from '@/lib/groups'

export default function PaceGroups() {
  const [milesSet, setMilesSet] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setMilesSet(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--about-pace-cols)', gap: 12 }}>
      {RUN_GROUPS.map((g, i) => {
        const showMiles = milesSet.has(i)
        return (
          <div key={g.name} style={{ background: g.bg, border: `1px solid ${g.border}`, borderRadius: 12, padding: '20px 18px' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: g.color, marginBottom: 6 }}>{g.name}</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: g.color, background: 'rgba(255,255,255,0.05)', border: `1px solid ${g.border}`, padding: '2px 7px', borderRadius: 4 }}>
                {g.distance}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: g.color, background: 'rgba(255,255,255,0.05)', border: `1px solid ${g.border}`, padding: '2px 7px', borderRadius: 4 }}>
                {g.style}
              </span>
              {g.paceKm ? (
                <button
                  onClick={() => toggle(i)}
                  title={showMiles ? 'Switch to km' : 'Switch to miles'}
                  style={{
                    fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-2)',
                    padding: '2px 7px', borderRadius: 4,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'color 0.15s',
                  }}
                >
                  {showMiles ? g.paceMi : g.paceKm}
                </button>
              ) : (
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--faint)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 4 }}>
                  No minimum pace
                </span>
              )}
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.7 }}>{g.desc}</p>
          </div>
        )
      })}
    </div>
  )
}
