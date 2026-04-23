'use client'
import { useState } from 'react'

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
  mobile: string | null
  emergency_name: string
  emergency_phone: string
  emergency_relationship: string
  medical_info: string | null
  consent_data: boolean
  health_declaration: boolean
  status: 'active' | 'inactive'
  created_at: string
}

export default function MembersClient({ members: initial }: { members: Member[] }) {
  const [members, setMembers]   = useState<Member[]>(initial)
  const [query, setQuery]       = useState('')
  const [filter, setFilter]     = useState<'all' | 'active' | 'inactive'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const filtered = members.filter(m => {
    const name = `${m.first_name} ${m.last_name}`.toLowerCase()
    const matchesQ = name.includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase())
    const matchesF = filter === 'all' || m.status === filter
    return matchesQ && matchesF
  })

  const activeCount   = members.filter(m => m.status === 'active').length
  const inactiveCount = members.filter(m => m.status === 'inactive').length

  async function toggleStatus(id: string, current: 'active' | 'inactive') {
    const next = current === 'active' ? 'inactive' : 'active'
    setToggling(id)
    // Optimistic update
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: next } : m))
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        // Revert on failure
        setMembers(prev => prev.map(m => m.id === id ? { ...m, status: current } : m))
        console.error('Failed to update status')
      }
    } catch {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, status: current } : m))
    } finally {
      setToggling(null)
    }
  }

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total',    value: members.length,  key: 'all'      },
          { label: 'Active',   value: activeCount,     key: 'active'   },
          { label: 'Inactive', value: inactiveCount,   key: 'inactive' },
        ].map(({ label, value, key }) => (
          <button
            key={key}
            onClick={() => setFilter(key as 'all' | 'active' | 'inactive')}
            style={{
              background: filter === key ? '#1a1a1a' : '#111',
              border: `1px solid ${filter === key ? '#f5a623' : '#1e1e1e'}`,
              borderRadius: 10, padding: '12px 20px', cursor: 'pointer',
              textAlign: 'left', color: 'inherit',
            }}
          >
            <p style={{ fontSize: 22, fontWeight: 800, color: filter === key ? '#f5a623' : '#fff', letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', maxWidth: 400, background: '#111', border: '1px solid #222',
            borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
            fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#555' }}>No members found</p>
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 140px 110px 100px 80px',
            padding: '10px 20px', borderBottom: '1px solid #1a1a1a',
            fontSize: 11, fontWeight: 600, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <span>Name</span>
            <span>Email</span>
            <span>Mobile</span>
            <span>Joined</span>
            <span>Status</span>
            <span></span>
          </div>

          {filtered.map((m, i) => (
            <div key={m.id}>
              {/* Row */}
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 140px 110px 100px 80px',
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < filtered.length - 1 || expanded === m.id ? '1px solid #1a1a1a' : 'none',
                  cursor: 'pointer',
                  background: expanded === m.id ? '#141414' : 'transparent',
                }}
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>
                  {m.first_name} {m.last_name}
                </p>
                <p style={{ fontSize: 13, color: '#666' }}>{m.email}</p>
                <p style={{ fontSize: 13, color: '#555' }}>{m.mobile ?? '—'}</p>
                <p style={{ fontSize: 12, color: '#444' }}>
                  {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </p>
                <span>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 8px',
                    borderRadius: 4, letterSpacing: '0.05em',
                    background: m.status === 'active' ? '#0d2a0d' : '#1a1a1a',
                    color: m.status === 'active' ? '#4caf76' : '#555',
                    border: `1px solid ${m.status === 'active' ? '#1a3d1a' : '#222'}`,
                  }}>
                    {m.status}
                  </span>
                </span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleStatus(m.id, m.status)}
                    disabled={toggling === m.id}
                    style={{
                      fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: toggling === m.id ? 'wait' : 'pointer',
                      background: 'transparent', border: '1px solid #2a2a2a', color: '#555',
                      fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    }}
                  >
                    {toggling === m.id ? '…' : m.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === m.id && (
                <div style={{ padding: '16px 20px 20px', background: '#0d0d0d', borderBottom: i < filtered.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Emergency contact</p>
                      <p style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>{m.emergency_name}</p>
                      <p style={{ fontSize: 13, color: '#666' }}>{m.emergency_relationship}</p>
                      <p style={{ fontSize: 13, color: '#666' }}>{m.emergency_phone}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Medical info</p>
                      <p style={{ fontSize: 13, color: m.medical_info ? '#ccc' : '#444' }}>
                        {m.medical_info || 'None provided'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Consents</p>
                      <p style={{ fontSize: 13, color: m.consent_data ? '#4caf76' : '#e05252' }}>
                        {m.consent_data ? '✓' : '✗'} Data processing
                      </p>
                      <p style={{ fontSize: 13, color: m.health_declaration ? '#4caf76' : '#e05252' }}>
                        {m.health_declaration ? '✓' : '✗'} Health declaration
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#333', marginTop: 16 }}>
        {filtered.length} of {members.length} members
        {query && ` matching "${query}"`}
        {filter !== 'all' && ` · ${filter} only`}
      </p>
    </div>
  )
}
