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
  photo_consent: boolean
  email_opt_out: boolean
  status: 'active' | 'inactive'
  created_at: string
  is_run_leader: boolean
  uka_number: string | null
}

export default function MembersClient({ members: initial }: { members: Member[] }) {
  const [members, setMembers]   = useState<Member[]>(initial)
  const [query, setQuery]       = useState('')
  const [filter, setFilter]     = useState<'all' | 'active' | 'inactive' | 'no_photo'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const filtered = members.filter(m => {
    const name = `${m.first_name} ${m.last_name}`.toLowerCase()
    const matchesQ = name.includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase())
    const matchesF = filter === 'all'
      || (filter === 'no_photo' && !m.photo_consent && m.status === 'active')
      || m.status === filter
    return matchesQ && matchesF
  })

  const activeCount      = members.filter(m => m.status === 'active').length
  const inactiveCount    = members.filter(m => m.status === 'inactive').length
  const noPhotoCount     = members.filter(m => !m.photo_consent && m.status === 'active').length
  const runLeaderCount   = members.filter(m => m.is_run_leader).length

  async function toggleStatus(id: string, current: 'active' | 'inactive') {
    const next = current === 'active' ? 'inactive' : 'active'
    setToggling(id)
    const cleared = next === 'inactive'
      ? { emergency_name: '', emergency_phone: '', emergency_relationship: '', medical_info: null }
      : {}
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: next, ...cleared } : m))
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) setMembers(prev => prev.map(m => m.id === id ? { ...m, status: current } : m))
    } catch {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, status: current } : m))
    } finally {
      setToggling(null)
    }
  }

  async function toggleLeader(id: string, current: boolean) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_run_leader: !current } : m))
    const res = await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_run_leader: !current }),
    })
    if (!res.ok) setMembers(prev => prev.map(m => m.id === id ? { ...m, is_run_leader: current } : m))
  }

  async function saveUka(id: string, uka: string) {
    await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uka_number: uka }),
    })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, uka_number: uka || null } : m))
  }

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',            value: members.length, key: 'all'      },
          { label: 'Active',           value: activeCount,    key: 'active'   },
          { label: 'Inactive',         value: inactiveCount,  key: 'inactive' },
          { label: 'No photo consent', value: noPhotoCount,   key: 'no_photo' },
        ].map(({ label, value, key }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            style={{
              background: filter === key ? '#1a1a1a' : '#111',
              border: `1px solid ${filter === key ? (key === 'no_photo' ? '#e05252' : '#f5a623') : '#1e1e1e'}`,
              borderRadius: 10, padding: '12px 20px', cursor: 'pointer',
              textAlign: 'left', color: 'inherit',
            }}
          >
            <p style={{ fontSize: 22, fontWeight: 800, color: filter === key ? (key === 'no_photo' ? '#e05252' : '#f5a623') : '#fff', letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</p>
          </button>
        ))}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 20px', textAlign: 'left',
        }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#f5a623', letterSpacing: '-0.02em' }}>{runLeaderCount}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Run leaders</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', fontSize: 'var(--text-base)', color: 'var(--white)',
            fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--muted)' }}>No members found</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 140px 110px 100px 80px',
            padding: '10px 20px', borderBottom: '1px solid var(--border)',
            fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <span>Name</span><span>Email</span><span>Mobile</span>
            <span>Joined</span><span>Status</span><span></span>
          </div>

          {filtered.map((m, i) => (
            <div key={m.id}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)' }}>
                    {m.first_name} {m.last_name}
                  </p>
                  {m.is_run_leader && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      background: '#2a1a04', color: '#f5a623', border: '1px solid #4a2a04',
                      borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase',
                    }}>Leader</span>
                  )}
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{m.email}</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{m.mobile ?? '—'}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </p>
                <span>
                  <span style={{
                    display: 'inline-block', fontSize: 'var(--text-xs)', fontWeight: 600, padding: '3px 8px',
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
                      fontSize: 'var(--text-xs)', padding: '5px 10px', borderRadius: 6, cursor: toggling === m.id ? 'wait' : 'pointer',
                      background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--muted)',
                      fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    }}
                  >
                    {toggling === m.id ? '…' : m.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === m.id && (
                <div style={{ padding: '20px', background: '#0d0d0d', borderBottom: i < filtered.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Emergency contact</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dim)', fontWeight: 600 }}>{m.emergency_name}</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{m.emergency_relationship}</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{m.emergency_phone}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Medical info</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: m.medical_info ? '#ccc' : '#444' }}>
                        {m.medical_info || 'None provided'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Consents</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: m.consent_data ? '#4caf76' : '#e05252' }}>
                        {m.consent_data ? '✓' : '✗'} Data processing
                      </p>
                      <p style={{ fontSize: 'var(--text-sm)', color: m.health_declaration ? '#4caf76' : '#e05252' }}>
                        {m.health_declaration ? '✓' : '✗'} Health declaration
                      </p>
                      <p style={{ fontSize: 'var(--text-sm)', color: m.photo_consent ? '#4caf76' : '#e05252' }}>
                        {m.photo_consent ? '✓' : '✗'} Photo consent
                      </p>
                      <p style={{ fontSize: 'var(--text-sm)', color: !m.email_opt_out ? '#4caf76' : '#e05252' }}>
                        {!m.email_opt_out ? '✓' : '✗'} Club emails
                      </p>
                    </div>
                  </div>

                  {/* Run leader section */}
                  <div style={{
                    borderTop: '1px solid var(--border)', paddingTop: 16,
                    display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Run leader</p>
                      <button
                        onClick={() => toggleLeader(m.id, m.is_run_leader)}
                        style={{
                          width: 44, height: 24, borderRadius: 12, border: 'none',
                          cursor: 'pointer', background: m.is_run_leader ? '#f5a623' : '#222',
                          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                        }}
                        aria-label="Toggle run leader"
                      >
                        <span style={{
                          position: 'absolute', top: 3,
                          left: m.is_run_leader ? 23 : 3,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                        }} />
                      </button>
                    </div>

                    {m.is_run_leader && (
                      <UkaInput
                        memberId={m.id}
                        initialValue={m.uka_number ?? ''}
                        onSave={(uka) => saveUka(m.id, uka)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
        {filtered.length} of {members.length} members
        {query && ` matching "${query}"`}
        {filter !== 'all' && ` · ${filter} only`}
      </p>
    </div>
  )
}

function UkaInput({ memberId, initialValue, onSave }: { memberId: string; initialValue: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(value)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>UKA number</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="e.g. 5001234"
            style={{
              background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 6,
              padding: '6px 10px', fontSize: 'var(--text-sm)', color: 'var(--dim)',
              fontFamily: 'Inter, sans-serif', outline: 'none', width: 130,
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--card-hi)', border: '1px solid var(--border-2)', borderRadius: 6,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              color: saved ? '#4caf76' : '#888', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {saving ? '…' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
