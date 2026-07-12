'use client'

import { useState } from 'react'

type AwardRow = {
  memberId: string
  name: string
  awardsPublic: boolean
  kind: 'run' | 'volunteer'
  rung: number
  achievedOn: string | null
  notified: boolean
  createdAt: string
}

const LADDER_LABEL: Record<AwardRow['kind'], string> = { run: 'Runs', volunteer: 'Leading' }

function isCentury(rung: number) {
  return rung % 100 === 0
}

export default function RecognitionClient({ awards }: { awards: AwardRow[] }) {
  const [query, setQuery] = useState('')
  const [ladderFilter, setLadderFilter] = useState<'all' | AwardRow['kind']>('all')
  const [notifiedFilter, setNotifiedFilter] = useState<'all' | 'pending' | 'notified'>('all')

  const filtered = awards.filter((a) => {
    const matchesQ = query === '' || a.name.toLowerCase().includes(query.toLowerCase())
    const matchesLadder = ladderFilter === 'all' || a.kind === ladderFilter
    const matchesNotified =
      notifiedFilter === 'all' || (notifiedFilter === 'pending' ? !a.notified : a.notified)
    return matchesQ && matchesLadder && matchesNotified
  })

  const pendingCount = awards.filter((a) => !a.notified).length

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total crossings', value: awards.length },
          { label: 'Pending celebration', value: pendingCount },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 2 }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          style={{
            flex: '1 1 220px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '9px 12px', fontSize: 'var(--text-base)', color: 'var(--white)', fontFamily: 'Inter, sans-serif', outline: 'none',
          }}
        />
        <select
          value={ladderFilter}
          onChange={(e) => setLadderFilter(e.target.value as typeof ladderFilter)}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 'var(--text-base)', color: 'var(--white)', fontFamily: 'Inter, sans-serif' }}
        >
          <option value="all">Both ladders</option>
          <option value="run">Runs</option>
          <option value="volunteer">Leading</option>
        </select>
        <select
          value={notifiedFilter}
          onChange={(e) => setNotifiedFilter(e.target.value as typeof notifiedFilter)}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 'var(--text-base)', color: 'var(--white)', fontFamily: 'Inter, sans-serif' }}
        >
          <option value="all">Any notification state</option>
          <option value="pending">Pending celebration</option>
          <option value="notified">Already notified</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--card-hi)', textAlign: 'left' }}>
              {['Member', 'Ladder', 'Rung', 'Achieved', 'Notified', 'Public sharing'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={`${a.memberId}-${a.kind}-${a.rung}`} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{a.name}</td>
                <td style={{ padding: '10px 14px', color: 'var(--dim)' }}>{LADDER_LABEL[a.kind]}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontWeight: 700, color: isCentury(a.rung) ? 'var(--orange)' : 'var(--white)' }}>{a.rung}</span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--faint)' }}>
                  {a.achievedOn ?? 'pre-site'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    fontSize: 'var(--text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    color: a.notified ? 'var(--muted)' : '#0f0f0f',
                    background: a.notified ? 'var(--border)' : 'var(--orange)',
                  }}>
                    {a.notified ? 'Notified' : 'Pending'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--faint)' }}>{a.awardsPublic ? 'Public' : 'Private'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--faint)' }}>No crossings match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
