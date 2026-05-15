'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Member = {
  id: string
  first_name: string
  last_name: string
  mobile: string | null
  emergency_name: string
  emergency_phone: string
  emergency_relationship: string
  medical_info: string | null
  photo_consent: boolean
}

export default function LeaderLookup({
  members,
  leaderName,
  ukaNumber,
  c25kEnabled = false,
}: {
  members: Member[]
  leaderName: string
  ukaNumber?: string
  c25kEnabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/leader/login')
  }

  const results = query.trim().length < 1 ? [] : members.filter(m => {
    const full = `${m.first_name} ${m.last_name}`.toLowerCase()
    return full.includes(query.toLowerCase())
  })

  const showAll = query.trim().length === 0

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      fontFamily: 'Inter, sans-serif', color: 'var(--white)',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <a href="/" style={{ textDecoration: 'none' }}>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              radcliffe<span style={{ color: '#f5a623' }}>.run</span>
            </p>
          </a>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Emergency contacts
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>{leaderName}</p>
          {ukaNumber && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)' }}>UKA {ukaNumber}</p>
          )}
          <button
            onClick={signOut}
            style={{
              marginTop: 4, fontSize: 'var(--text-xs)', color: 'var(--muted)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* C25K shortcut */}
      {c25kEnabled && (
        <div style={{ padding: '16px 20px 0' }}>
          <Link href="/leader/c25k" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg,#0f060f,#160c16)',
            border: '1px solid rgba(218,130,218,0.3)',
            borderRadius: 12, padding: '14px 18px', textDecoration: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🎓</span>
              <div>
                <p style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--white)', margin: '0 0 2px' }}>Couch to 5K</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Programme roster &amp; emergency contacts</p>
              </div>
            </div>
            <span style={{ fontSize: 18, color: '#da82da' }}>→</span>
          </Link>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="search"
            autoFocus
            placeholder="Search by runner name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', background: '#161616', border: '1px solid var(--border-2)',
              borderRadius: 10, padding: '14px 16px', fontSize: 16, color: 'var(--white)',
              fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          {members.length} active members — start typing to find someone
        </p>
      </div>

      {/* Results */}
      <div style={{ padding: '0 20px 32px' }}>
        {showAll && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '40px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 'var(--text-base)',
          }}>
            <p style={{ fontSize: 28, marginBottom: 12 }}>🔍</p>
            <p>Type a runner&apos;s name to find their emergency contact.</p>
          </div>
        )}

        {!showAll && results.length === 0 && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '32px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 'var(--text-base)',
          }}>
            No active members matching &ldquo;{query}&rdquo;
          </div>
        )}

        {results.map(m => (
          <MemberCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  )
}

function MemberCard({ m }: { m: Member }) {
  const hasMedical = m.medical_info && m.medical_info.trim().length > 0

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${hasMedical ? '#3a1a0a' : '#1e1e1e'}`,
      borderRadius: 14, padding: '20px', marginBottom: 12,
      boxShadow: hasMedical ? '0 0 0 1px rgba(245,120,35,0.15)' : 'none',
    }}>
      {/* Runner name + mobile */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--white)' }}>
            {m.first_name} {m.last_name}
          </p>
          {m.mobile && (
            <a
              href={`tel:${m.mobile}`}
              style={{ fontSize: 'var(--text-md)', color: '#f5a623', fontWeight: 600, textDecoration: 'none' }}
            >
              📞 {m.mobile}
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
          {!m.photo_consent && (
            <span style={{
              fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              background: '#1a0a0a', color: '#e05252', border: '1px solid #3a1a1a',
              borderRadius: 6, padding: '4px 8px',
            }}>
              No photos
            </span>
          )}
          {hasMedical && (
            <span style={{
              fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              background: '#3a1a0a', color: '#f5a623', border: '1px solid #5a2a0a',
              borderRadius: 6, padding: '4px 8px',
            }}>
              Medical info
            </span>
          )}
        </div>
      </div>

      {/* Emergency contact */}
      <div style={{
        background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', marginBottom: hasMedical ? 12 : 0,
      }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Emergency contact
        </p>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--dim)', marginBottom: 2 }}>
          {m.emergency_name}
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 10 }}>
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
          <p style={{ fontSize: 'var(--text-base)', color: '#ddaa88', lineHeight: 1.5 }}>
            {m.medical_info}
          </p>
        </div>
      )}
    </div>
  )
}
