'use client'
import { useState } from 'react'
import { ROUTES } from '@/lib/routes'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return { day: d.getDate(), month: MONTHS[d.getMonth()], weekday: DAYS[d.getDay()] }
}

type Run = {
  id: string
  created_at: string
  date: string
  title: string
  description: string | null
  route_slug: string | null
  distance_km: number | null
  terrain: 'road' | 'trail' | 'mixed' | null
  meeting_point: string
  meeting_map_url: string | null
  leader_name: string | null
  cancelled: boolean
  on_tour: boolean
  has_jeffing: boolean
  run_type: string
}

type FormData = {
  date: string
  title: string
  description: string
  route_slug: string
  distance_km: string
  terrain: string
  meeting_point: string
  leader_name: string
  run_type: string
  has_jeffing: boolean
}

const RUN_TYPES = [
  { value: 'regular', label: 'Regular Thursday run' },
  { value: 'social',  label: 'Social / bank holiday run' },
  { value: 'walk',    label: 'Walk' },
  { value: 'c25k',    label: 'Couch to 5k' },
]

const BLANK: FormData = {
  date: '',
  title: '',
  description: '',
  route_slug: '',
  distance_km: '',
  terrain: '',
  meeting_point: 'Radcliffe Market, Blackburn Street, M26 1PN',
  leader_name: '',
  run_type: 'regular',
  has_jeffing: false,
}

const TERRAIN_COLOURS: Record<string, { bg: string; color: string; border: string }> = {
  road:  { bg: '#0d1a2a', color: '#5b9bd5', border: '#1a2d42' },
  trail: { bg: '#0d2a0d', color: '#4caf76', border: '#1a3d1a' },
  mixed: { bg: '#1a1a0d', color: '#c9a84c', border: '#2a2a1a' },
}

function TerrainBadge({ terrain }: { terrain: string | null }) {
  if (!terrain) return null
  const c = TERRAIN_COLOURS[terrain] ?? { bg: '#111', color: '#555', border: '#222' }
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 7px',
      borderRadius: 4, letterSpacing: '0.08em', textTransform: 'uppercase',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{terrain}</span>
  )
}

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, color: '#fff', fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box', ...extra,
  }
}
function labelStyle(): React.CSSProperties {
  return { display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }
}

export default function RunsClient({ runs: initial }: { runs: Run[] }) {
  const today = new Date().toISOString().split('T')[0]

  const [runs, setRuns]         = useState<Run[]>(initial)
  const [showPast, setShowPast] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<FormData>(BLANK)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [syncing, setSyncing]   = useState(false)
  const [syncResult, setSyncResult] = useState<{ inserted: number; updated: number; errors: number } | null>(null)

  async function syncFromSheet() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/runs/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      setSyncResult({ inserted: data.inserted, updated: data.updated, errors: data.errors })
      // Delay reload so the result banner is visible
      setTimeout(() => window.location.reload(), 3000)
    } catch (err) {
      setSyncResult({ inserted: 0, updated: 0, errors: 1 })
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

  const upcoming = runs.filter(r => r.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past     = runs.filter(r => r.date < today).sort((a, b) => b.date.localeCompare(a.date))
  const displayed = showPast ? past : upcoming

  function openAdd() {
    setEditId(null)
    setForm(BLANK)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(run: Run) {
    setEditId(run.id)
    setForm({
      date: run.date,
      title: run.title,
      description: run.description ?? '',
      route_slug: run.route_slug ?? '',
      distance_km: run.distance_km?.toString() ?? '',
      terrain: run.terrain ?? '',
      meeting_point: run.meeting_point,
      leader_name: run.leader_name ?? '',
      run_type: run.run_type ?? 'regular',
      has_jeffing: run.has_jeffing ?? false,
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setForm(BLANK)
    setFormError(null)
  }

  function set(field: keyof FormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const body = {
      date: form.date,
      title: form.title.trim(),
      description: form.description.trim() || null,
      route_slug: form.route_slug.trim() || null,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      terrain: form.terrain || null,
      meeting_point: form.meeting_point.trim(),
      leader_name: form.leader_name.trim() || null,
      run_type: form.run_type,
      has_jeffing: form.has_jeffing,
    }

    try {
      if (editId) {
        const res = await fetch(`/api/admin/runs/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
        const updated = await res.json()
        setRuns(prev => prev.map(r => r.id === editId ? updated : r))
      } else {
        const res = await fetch('/api/admin/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
        const created = await res.json()
        setRuns(prev => [created, ...prev])
      }
      closeForm()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function toggleCancel(run: Run) {
    setToggling(run.id)
    const next = !run.cancelled
    setRuns(prev => prev.map(r => r.id === run.id ? { ...r, cancelled: next } : r))
    try {
      const res = await fetch(`/api/admin/runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelled: next }),
      })
      if (!res.ok) setRuns(prev => prev.map(r => r.id === run.id ? { ...r, cancelled: run.cancelled } : r))
    } catch {
      setRuns(prev => prev.map(r => r.id === run.id ? { ...r, cancelled: run.cancelled } : r))
    } finally {
      setToggling(null)
    }
  }

  async function deleteRun(id: string) {
    if (!confirm('Delete this run? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/runs/${id}`, { method: 'DELETE' })
      if (res.ok) setRuns(prev => prev.filter(r => r.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  function formatDate(d: string) {
    const { day, month, weekday } = fmtDate(d)
    const year = new Date(d + 'T00:00:00').getFullYear()
    return `${weekday} ${day} ${month} ${year}`
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['upcoming', 'past'] as const).map(v => (
            <button key={v} onClick={() => setShowPast(v === 'past')} style={{
              fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', border: '1px solid',
              background: (v === 'past') === showPast ? '#f5a623' : 'transparent',
              color:      (v === 'past') === showPast ? '#0a0a0a' : '#555',
              borderColor:(v === 'past') === showPast ? '#f5a623' : '#2a2a2a',
            }}>
              {v === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={syncFromSheet} disabled={syncing} style={{
            fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, cursor: syncing ? 'wait' : 'pointer',
            background: 'transparent', color: syncing ? '#555' : '#888', border: '1px solid #2a2a2a',
            fontFamily: 'Inter, sans-serif',
          }}>
            {syncing ? 'Syncing…' : '↻ Sync from sheet'}
          </button>
          <button onClick={openAdd} style={{
            fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            background: '#f5a623', color: '#0a0a0a', border: 'none', fontFamily: 'Inter, sans-serif',
          }}>
            + Add run
          </button>
        </div>
      </div>

      {syncResult && (
        <div style={{
          background: syncResult.errors > 0 ? '#1a0d0d' : '#0d1a0d',
          border: `1px solid ${syncResult.errors > 0 ? '#3d1a1a' : '#1a3d1a'}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: syncResult.errors > 0 ? '#e05252' : '#4caf76',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>
            {syncResult.errors > 0
              ? `Sync done — ${syncResult.inserted} added, ${syncResult.updated} updated, ${syncResult.errors} errors`
              : `Sync complete — ${syncResult.inserted} added, ${syncResult.updated} updated`}
          </span>
          <button onClick={() => setSyncResult(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Slide-in form */}
      {showForm && (
        <div style={{
          background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
          padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>{editId ? 'Edit run' : 'New run'}</h2>
            <button onClick={closeForm} style={{ background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle()}>Date *</label>
                <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Title *</label>
                <input type="text" required placeholder="Thursday evening run" value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle()} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle()}>Description</label>
              <textarea rows={2} placeholder="Optional details…" value={form.description} onChange={e => set('description', e.target.value)}
                style={{ ...inputStyle(), resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle()}>Terrain</label>
                <select value={form.terrain} onChange={e => set('terrain', e.target.value)} style={inputStyle()}>
                  <option value="">— unset —</option>
                  <option value="road">Road</option>
                  <option value="trail">Trail</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle()}>Distance (km)</label>
                <input type="number" step="0.1" min="0" placeholder="8.0" value={form.distance_km} onChange={e => set('distance_km', e.target.value)} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Route</label>
                <select value={form.route_slug} onChange={e => set('route_slug', e.target.value)} style={inputStyle()}>
                  <option value="">— no route linked —</option>
                  <optgroup label="Trail 5k">
                    {ROUTES.filter(r => r.category === 'trail-5k').map(r => (
                      <option key={r.slug} value={r.slug}>{r.name} ({r.distance_km} km)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Trail 8k">
                    {ROUTES.filter(r => r.category === 'trail-8k').map(r => (
                      <option key={r.slug} value={r.slug}>{r.name} ({r.distance_km} km)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Road 5k">
                    {ROUTES.filter(r => r.category === 'road-5k').map(r => (
                      <option key={r.slug} value={r.slug}>{r.name} ({r.distance_km} km)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Road 8k">
                    {ROUTES.filter(r => r.category === 'road-8k').map(r => (
                      <option key={r.slug} value={r.slug}>{r.name} ({r.distance_km} km)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Social long run">
                    {ROUTES.filter(r => r.category === 'social-long-run').map(r => (
                      <option key={r.slug} value={r.slug}>{r.name} ({r.distance_km} km)</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle()}>Meeting point</label>
                <input type="text" value={form.meeting_point} onChange={e => set('meeting_point', e.target.value)} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Leader name</label>
                <input type="text" placeholder="Paul Cox" value={form.leader_name} onChange={e => set('leader_name', e.target.value)} style={inputStyle()} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20, alignItems: 'end' }}>
              <div>
                <label style={labelStyle()}>Session type</label>
                <select value={form.run_type} onChange={e => set('run_type', e.target.value)} style={inputStyle()}>
                  {RUN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {/* Jeffing toggle — only relevant for regular trail/road runs */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingBottom: 10, whiteSpace: 'nowrap' }}>
                <span style={{ position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
                  <input
                    type="checkbox"
                    checked={form.has_jeffing}
                    onChange={e => set('has_jeffing', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 22,
                    background: form.has_jeffing ? '#f5a623' : '#222',
                    border: `1px solid ${form.has_jeffing ? '#f5a623' : '#333'}`,
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: form.has_jeffing ? 20 : 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: form.has_jeffing ? '#0a0a0a' : '#555',
                      transition: 'left 0.2s',
                    }} />
                  </span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: form.has_jeffing ? '#f5a623' : '#555', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Jeffing tonight
                </span>
              </label>
            </div>

            {formError && <p style={{ fontSize: 13, color: '#e05252', marginBottom: 16 }}>⚠️ {formError}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{
                fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 8,
                background: saving ? '#2a2a2a' : '#f5a623', color: saving ? '#555' : '#0a0a0a',
                border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                {saving ? 'Saving…' : editId ? 'Save changes' : 'Add run'}
              </button>
              <button type="button" onClick={closeForm} style={{
                fontSize: 14, fontWeight: 500, padding: '10px 20px', borderRadius: 8,
                background: 'transparent', color: '#555', border: '1px solid #222', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Run list */}
      {displayed.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#555' }}>{showPast ? 'No past runs recorded' : 'No upcoming runs scheduled'}</p>
          {!showPast && <button onClick={openAdd} style={{ marginTop: 12, fontSize: 13, color: '#f5a623', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Add the first one →</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(run => (
            <div key={run.id} style={{
              background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20,
              opacity: run.cancelled ? 0.55 : 1,
            }}>
              {/* Date block */}
              {(() => { const { day, month, weekday } = fmtDate(run.date); return (
              <div style={{ minWidth: 52, textAlign: 'center', flexShrink: 0 }}>
                <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: run.cancelled ? '#555' : '#f5a623', letterSpacing: '-0.02em' }}>{day}</p>
                <p style={{ fontSize: 11, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month}</p>
                <p style={{ fontSize: 10, color: '#333' }}>{weekday}</p>
              </div>
              )})()}

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {run.title}
                  </p>
                  {run.cancelled && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#2a0d0d', color: '#e05252', border: '1px solid #3d1a1a', letterSpacing: '0.08em', flexShrink: 0 }}>
                      CANCELLED
                    </span>
                  )}
                  {run.on_tour && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#1a1200', color: '#f5a623', border: '1px solid #3d2e00', letterSpacing: '0.08em', flexShrink: 0 }}>
                      ON TOUR
                    </span>
                  )}
                  {run.run_type === 'social' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#1a0d2a', color: '#a78bfa', border: '1px solid #2d1a44', letterSpacing: '0.08em', flexShrink: 0 }}>
                      SOCIAL
                    </span>
                  )}
                  {run.run_type === 'walk' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#0d1a1a', color: '#4ecdc4', border: '1px solid #1a3a3a', letterSpacing: '0.08em', flexShrink: 0 }}>
                      WALK
                    </span>
                  )}
                  {run.run_type === 'c25k' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#1a0d1a', color: '#da82da', border: '1px solid #3a1a3a', letterSpacing: '0.08em', flexShrink: 0 }}>
                      C25K
                    </span>
                  )}
                  {run.has_jeffing && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#1a1200', color: '#fbbf24', border: '1px solid #3d2e00', letterSpacing: '0.08em', flexShrink: 0 }}>
                      JEFFING
                    </span>
                  )}
                  <TerrainBadge terrain={run.terrain} />
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {run.distance_km && <span style={{ fontSize: 12, color: '#555' }}>{run.distance_km} km</span>}
                  {run.leader_name && <span style={{ fontSize: 12, color: '#555' }}>Led by {run.leader_name}</span>}
                  {run.route_slug  && <span style={{ fontSize: 12, color: '#444' }}>Route: {run.route_slug}</span>}
                  <span style={{ fontSize: 12, color: '#333' }}>{run.meeting_point}</span>
                  {run.meeting_map_url && (
                    <a href={run.meeting_map_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#f5a623', textDecoration: 'none' }}
                      onClick={e => e.stopPropagation()}>
                      Map ↗
                    </a>
                  )}
                </div>
                {run.description && <p style={{ fontSize: 12, color: '#444', marginTop: 4 }}>{run.description}</p>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(run)} style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                  background: 'transparent', border: '1px solid #222', color: '#666',
                  fontFamily: 'Inter, sans-serif', fontWeight: 500,
                }}>
                  Edit
                </button>
                <button
                  onClick={() => toggleCancel(run)}
                  disabled={toggling === run.id}
                  style={{
                    fontSize: 12, padding: '6px 12px', borderRadius: 6, cursor: toggling === run.id ? 'wait' : 'pointer',
                    background: 'transparent', fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    border: run.cancelled ? '1px solid #1a3d1a' : '1px solid #3d1a1a',
                    color:  run.cancelled ? '#4caf76'           : '#e05252',
                  }}
                >
                  {toggling === run.id ? '…' : run.cancelled ? 'Restore' : 'Cancel'}
                </button>
                <button
                  onClick={() => deleteRun(run.id)}
                  disabled={deleting === run.id}
                  style={{
                    fontSize: 12, padding: '6px 12px', borderRadius: 6, cursor: deleting === run.id ? 'wait' : 'pointer',
                    background: 'transparent', border: '1px solid #1e1e1e', color: '#333',
                    fontFamily: 'Inter, sans-serif', fontWeight: 500,
                  }}
                >
                  {deleting === run.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#333', marginTop: 16 }}>
        {displayed.length} {showPast ? 'past' : 'upcoming'} run{displayed.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
