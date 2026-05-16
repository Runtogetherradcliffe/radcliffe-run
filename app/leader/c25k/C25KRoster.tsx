'use client'

import { useState } from 'react'
import Link from 'next/link'

type Member = {
  id: string
  first_name: string
  last_name: string
  mobile: string | null
  c25k_session: string | null
  emergency_name: string
  emergency_phone: string
  emergency_relationship: string
  medical_info: string | null
  photo_consent: boolean
}

type Filter = 'all' | 'tuesday' | 'thursday'

const SESSION_LABEL: Record<string, string> = {
  tuesday:  'Tuesday',
  thursday: 'Thursday',
  both:     'Tue + Thu',
}

export default function C25KRoster({
  members,
  leaderName,
}: {
  members: Member[]
  leaderName: string
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = members.filter(m => {
    if (filter === 'all') return true
    if (filter === 'tuesday')  return m.c25k_session === 'tuesday'  || m.c25k_session === 'both'
    if (filter === 'thursday') return m.c25k_session === 'thursday' || m.c25k_session === 'both'
    return true
  })

  const tuesdayCount  = members.filter(m => m.c25k_session === 'tuesday'  || m.c25k_session === 'both').length
  const thursdayCount = members.filter(m => m.c25k_session === 'thursday' || m.c25k_session === 'both').length
  const medicalCount  = members.filter(m => m.medical_info && m.medical_info.trim().length > 0).length

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 99, border: 'none', cursor: 'pointer',
    fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'Inter, sans-serif',
    background: active ? '#da82da' : '#1a1a1a',
    color: active ? '#0a0a0a' : '#666',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif', color: 'var(--white)' }}>

      {/* Header */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/leader" style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back
          </Link>
          <div style={{ width: 1, height: 20, background: '#222' }} />
          <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            🎓 C25K Roster
          </p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--faint)', margin: 0 }}>{leaderName}</p>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 640, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: members.length, colour: '#da82da' },
            { label: 'Tuesdays', value: tuesdayCount, colour: '#4a9eff' },
            { label: 'Thursdays', value: thursdayCount, colour: '#f5a623' },
            ...(medicalCount > 0 ? [{ label: 'Medical info', value: medicalCount, colour: '#f58a35' }] : []),
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 80,
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: s.colour, margin: '0 0 2px' }}>
                {s.value}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--faint)', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Session filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button style={filterBtnStyle(filter === 'all')}      onClick={() => setFilter('all')}>All</button>
          <button style={filterBtnStyle(filter === 'tuesday')}  onClick={() => setFilter('tuesday')}>Tuesday</button>
          <button style={filterBtnStyle(filter === 'thursday')} onClick={() => setFilter('thursday')}>Thursday</button>
        </div>

        {/* Member cards */}
        {members.length === 0 ? (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '48px 24px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, marginBottom: 16 }}>🏃</p>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, margin: '0 0 8px' }}>No C25K registrations yet</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--faint)', margin: 0 }}>
              Share <span style={{ color: '#da82da' }}>radcliffe.run/c25k</span> to get sign-ups.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '32px 24px', textAlign: 'center', color: 'var(--faint)', fontSize: 'var(--text-base)',
          }}>
            No {filter} session runners registered.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(m => <MemberCard key={m.id} m={m} />)}
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 20, textAlign: 'center' }}>
          {filtered.length} of {members.length} shown
        </p>
      </div>
    </div>
  )
}

function MemberCard({ m }: { m: Member }) {
  const [expanded, setExpanded] = useState(false)
  const hasMedical = !!(m.medical_info && m.medical_info.trim().length > 0)
  const sessionLabel = m.c25k_session ? (SESSION_LABEL[m.c25k_session] ?? m.c25k_session) : null
  const sessionColour = m.c25k_session === 'both' ? '#f5a623'
    : m.c25k_session === 'tuesday'  ? '#4a9eff'
    : m.c25k_session === 'thursday' ? '#f5a623'
    : '#555'

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${hasMedical ? '#3a1a0a' : '#1e1e1e'}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: hasMedical ? '0 0 0 1px rgba(245,120,35,0.12)' : 'none',
    }}>
      {/* Summary row - always visible, tap to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '16px 20px', textAlign: 'left', fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              {m.first_name} {m.last_name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {sessionLabel && (
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 600, color: sessionColour,
                  background: `${sessionColour}18`, border: `1px solid ${sessionColour}30`,
                  borderRadius: 99, padding: '2px 8px',
                }}>
                  {sessionLabel}
                </span>
              )}
              {hasMedical && (
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.04em',
                  background: '#3a1a0a', color: '#f5a623', border: '1px solid #5a2a0a',
                  borderRadius: 6, padding: '2px 7px',
                }}>
                  ⚠️ Medical
                </span>
              )}
              {!m.photo_consent && (
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.04em',
                  background: '#1a0a0a', color: '#e05252', border: '1px solid #3a1a1a',
                  borderRadius: 6, padding: '2px 7px',
                }}>
                  No photos
                </span>
              )}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          ⌄
        </span>
      </button>

      {/* Expanded: runner mobile + emergency contact + medical */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>

          {/* Runner's own mobile */}
          {m.mobile && (
            <div style={{ paddingTop: 16, marginBottom: 12 }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Runner
              </p>
              <a href={`tel:${m.mobile}`} style={{ fontSize: 16, color: '#f5a623', fontWeight: 700, textDecoration: 'none' }}>
                📞 {m.mobile}
              </a>
            </div>
          )}

          {/* Emergency contact */}
          <div style={{
            background: 'var(--bg)', borderRadius: 10, padding: '14px 16px',
            marginTop: m.mobile ? 0 : 16,
            marginBottom: hasMedical ? 12 : 0,
          }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Emergency contact
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--dim)', margin: '0 0 2px' }}>
              {m.emergency_name}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: '0 0 10px' }}>
              {m.emergency_relationship}
            </p>
            <a
              href={`tel:${m.emergency_phone}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#1a3a1a', border: '1px solid #2a5a2a',
                borderRadius: 8, padding: '10px 16px',
                fontSize: 18, fontWeight: 800, color: '#4cdf84',
                textDecoration: 'none', letterSpacing: '-0.01em',
              }}
            >
              📞 {m.emergency_phone}
            </a>
          </div>

          {/* Medical info */}
          {hasMedical && (
            <div style={{
              background: '#1c0d04', border: '1px solid #3a1a0a',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#995522', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                ⚠️ Medical information
              </p>
              <p style={{ fontSize: 'var(--text-base)', color: '#ddaa88', lineHeight: 1.6, margin: 0 }}>
                {m.medical_info}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
