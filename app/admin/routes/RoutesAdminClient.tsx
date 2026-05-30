'use client'
import { useState, useEffect, useRef } from 'react'
import { ROUTES, type Category } from '@/lib/routes'

type Override = { slug: string; name?: string; description?: string; updated_at: string }
type FileStatus = { ok: boolean; msg: string }

const CATEGORY_ORDER: Category[] = ['road-5k', 'road-8k', 'trail-5k', 'trail-8k', 'social-long-run']
const CATEGORY_LABELS: Record<Category, string> = {
  'road-5k': 'Road 5k',
  'road-8k': 'Road 8k',
  'trail-5k': 'Trail 5k',
  'trail-8k': 'Trail 8k',
  'social-long-run': 'Social Long Runs',
}

const TERRAIN_COLOURS: Record<string, { bg: string; color: string; border: string }> = {
  road:  { bg: '#0d1a2a', color: '#5b9bd5', border: '#1a2d42' },
  trail: { bg: '#0d2a0d', color: '#4caf76', border: '#1a3d1a' },
}

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '9px 12px', fontSize: 'var(--text-base)', color: 'var(--white)', fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box', resize: 'vertical', ...extra,
  }
}

function smallBtn(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
    fontFamily: 'Inter, sans-serif', ...extra,
  }
}

export default function RoutesAdminClient() {
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [loading, setLoading] = useState(true)
  const [editSlug, setEditSlug] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ slug: string; ok: boolean; msg: string } | null>(null)
  const [filterCat, setFilterCat] = useState<'all' | Category>('all')
  const [search, setSearch] = useState('')

  // File upload state
  const [gpxUploading, setGpxUploading] = useState<Set<string>>(new Set())
  const [gpxStatus, setGpxStatus] = useState<Record<string, FileStatus>>({})
  const [imgUploading, setImgUploading] = useState<Set<string>>(new Set())
  const [imgStatus, setImgStatus] = useState<Record<string, FileStatus>>({})
  const [showMapUpload, setShowMapUpload] = useState<Set<string>>(new Set())

  // Hidden file input refs
  const gpxInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const darkImgRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const lightImgRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/admin/routes')
      .then(r => r.json())
      .then((data: Override[]) => {
        const map: Record<string, Override> = {}
        for (const o of data) map[o.slug] = o
        setOverrides(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = ROUTES.filter(r => {
    if (filterCat !== 'all' && r.category !== filterCat) return false
    const name = overrides[r.slug]?.name ?? r.name
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.slug.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, routes: filtered.filter(r => r.category === cat) }))
    .filter(g => g.routes.length > 0)

  function startEdit(slug: string) {
    const override = overrides[slug]
    const staticRoute = ROUTES.find(r => r.slug === slug)
    setEditSlug(slug)
    setEditText(override?.description ?? staticRoute?.description ?? '')
    setSaveResult(null)
  }

  function cancelEdit() {
    setEditSlug(null)
    setEditText('')
  }

  async function saveDescription(slug: string) {
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, description: editText }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Save failed')
      }
      const saved: Override = await res.json()
      setOverrides(prev => ({ ...prev, [slug]: saved }))
      setEditSlug(null)
      setSaveResult({ slug, ok: true, msg: 'Saved' })
      setTimeout(() => setSaveResult(prev => prev?.slug === slug ? null : prev), 3000)
    } catch (err: unknown) {
      setSaveResult({ slug, ok: false, msg: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  async function revertToDefault(slug: string) {
    if (!confirm('Revert to the default description? This removes your custom text.')) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/routes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setOverrides(prev => {
        const next = { ...prev }
        delete next[slug]
        return next
      })
      setEditSlug(null)
      setSaveResult({ slug, ok: true, msg: 'Reverted to default' })
      setTimeout(() => setSaveResult(prev => prev?.slug === slug ? null : prev), 3000)
    } catch {
      setSaveResult({ slug, ok: false, msg: 'Revert failed' })
    } finally {
      setSaving(false)
    }
  }

  async function uploadGpx(slug: string, file: File) {
    setGpxUploading(prev => new Set(prev).add(slug))
    setGpxStatus(prev => ({ ...prev, [slug]: { ok: true, msg: 'Uploading...' } }))
    try {
      const fd = new FormData()
      fd.append('gpx', file)
      const res = await fetch(`/api/admin/routes/${slug}/gpx`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setGpxStatus(prev => ({ ...prev, [slug]: { ok: true, msg: 'GPX updated - pushed to staging' } }))
      setTimeout(() => setGpxStatus(prev => { const n = { ...prev }; delete n[slug]; return n }), 5000)
    } catch (err: unknown) {
      setGpxStatus(prev => ({ ...prev, [slug]: { ok: false, msg: err instanceof Error ? err.message : 'Upload failed' } }))
    } finally {
      setGpxUploading(prev => { const n = new Set(prev); n.delete(slug); return n })
      // Reset the file input
      if (gpxInputRefs.current[slug]) gpxInputRefs.current[slug]!.value = ''
    }
  }

  async function uploadMapImages(slug: string) {
    const darkFile = darkImgRefs.current[slug]?.files?.[0] ?? null
    const lightFile = lightImgRefs.current[slug]?.files?.[0] ?? null
    if (!darkFile && !lightFile) return

    setImgUploading(prev => new Set(prev).add(slug))
    setImgStatus(prev => ({ ...prev, [slug]: { ok: true, msg: 'Uploading...' } }))
    try {
      const fd = new FormData()
      if (darkFile) fd.append('dark', darkFile)
      if (lightFile) fd.append('light', lightFile)
      const res = await fetch(`/api/admin/routes/${slug}/map-image`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      const uploaded: string[] = data.uploaded ?? []
      setImgStatus(prev => ({ ...prev, [slug]: { ok: true, msg: `Map image${uploaded.length > 1 ? 's' : ''} updated (${uploaded.join(' + ')}) - pushed to staging` } }))
      setTimeout(() => setImgStatus(prev => { const n = { ...prev }; delete n[slug]; return n }), 5000)
      // Reset inputs and collapse
      if (darkImgRefs.current[slug]) darkImgRefs.current[slug]!.value = ''
      if (lightImgRefs.current[slug]) lightImgRefs.current[slug]!.value = ''
      setShowMapUpload(prev => { const n = new Set(prev); n.delete(slug); return n })
    } catch (err: unknown) {
      setImgStatus(prev => ({ ...prev, [slug]: { ok: false, msg: err instanceof Error ? err.message : 'Upload failed' } }))
    } finally {
      setImgUploading(prev => { const n = new Set(prev); n.delete(slug); return n })
    }
  }

  function toggleMapUpload(slug: string) {
    setShowMapUpload(prev => {
      const n = new Set(prev)
      if (n.has(slug)) n.delete(slug)
      else n.add(slug)
      return n
    })
  }

  if (loading) {
    return <p style={{ fontSize: 'var(--text-base)', color: 'var(--faint)' }}>Loading routes...</p>
  }

  const overrideCount = Object.keys(overrides).length

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#f5a623' }}>{ROUTES.length}</span>
          <span style={{ fontSize: 12, color: 'var(--faint)', marginLeft: 8 }}>routes</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#4caf76' }}>{overrideCount}</span>
          <span style={{ fontSize: 12, color: 'var(--faint)', marginLeft: 8 }}>custom descriptions</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#5b9bd5' }}>{ROUTES.length - overrideCount}</span>
          <span style={{ fontSize: 12, color: 'var(--faint)', marginLeft: 8 }}>using default</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[{ key: 'all' as const, label: 'All' }, ...CATEGORY_ORDER.map(c => ({ key: c, label: CATEGORY_LABELS[c] }))].map(f => (
          <button key={f.key} onClick={() => setFilterCat(f.key)} style={{
            fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', border: '1px solid',
            background: filterCat === f.key ? '#f5a623' : 'transparent',
            color: filterCat === f.key ? '#0a0a0a' : '#555',
            borderColor: filterCat === f.key ? '#f5a623' : '#2a2a2a',
          }}>
            {f.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search routes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...inputStyle({ width: 200, marginLeft: 'auto' }),
            fontSize: 12, padding: '6px 12px',
          }}
        />
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{filtered.length} routes shown</p>

      {/* Route list by category */}
      {grouped.map(({ cat, routes }) => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #1e1e1e' }}>
            {CATEGORY_LABELS[cat]}
            <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>({routes.length})</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {routes.map(route => {
              const override = overrides[route.slug]
              const isEditing = editSlug === route.slug
              const currentDesc = override?.description ?? route.description
              const hasOverride = !!override
              const tc = TERRAIN_COLOURS[route.terrain]
              const isGpxUploading = gpxUploading.has(route.slug)
              const isImgUploading = imgUploading.has(route.slug)
              const gpxSt = gpxStatus[route.slug]
              const imgSt = imgStatus[route.slug]
              const mapExpanded = showMapUpload.has(route.slug)

              return (
                <div key={route.slug} style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '14px 18px',
                  borderLeft: hasOverride ? '3px solid #4caf76' : '3px solid transparent',
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isEditing ? 12 : currentDesc ? 6 : 4 }}>
                    <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--dim)', flex: 1 }}>
                      {override?.name ?? route.name}
                      {override?.name && override.name !== route.name && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)', fontWeight: 400, marginLeft: 8 }}>
                          (was: {route.name})
                        </span>
                      )}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                    }}>{route.terrain}</span>
                    <span style={{ fontSize: 12, color: 'var(--faint)' }}>{route.distance_km} km</span>
                    {hasOverride && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#0d2a0d', color: '#4caf76', border: '1px solid #1a3d1a', letterSpacing: '0.06em' }}>
                        CUSTOM
                      </span>
                    )}
                    {saveResult?.slug === route.slug && (
                      <span style={{
                        fontSize: 'var(--text-xs)', fontWeight: 600, color: saveResult.ok ? '#4caf76' : '#e05252',
                      }}>
                        {saveResult.msg}
                      </span>
                    )}
                    {!isEditing && (
                      <button onClick={() => startEdit(route.slug)} style={{
                        fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                        background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
                        fontFamily: 'Inter, sans-serif', fontWeight: 500,
                      }}>
                        Edit
                      </button>
                    )}
                  </div>

                  {/* Description display */}
                  {!isEditing && currentDesc && (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6 }}>{currentDesc}</p>
                  )}
                  {!isEditing && !currentDesc && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No description</p>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div>
                      <textarea
                        rows={4}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        placeholder="Write a description for this route..."
                        style={inputStyle({ minHeight: 80 })}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                        <button
                          onClick={() => saveDescription(route.slug)}
                          disabled={saving || !editText.trim()}
                          style={{
                            fontSize: 'var(--text-sm)', fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                            background: saving || !editText.trim() ? '#2a2a2a' : '#f5a623',
                            color: saving || !editText.trim() ? '#555' : '#0a0a0a',
                            border: 'none', cursor: saving ? 'wait' : 'pointer',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} style={{
                          fontSize: 'var(--text-sm)', fontWeight: 500, padding: '8px 16px', borderRadius: 8,
                          background: 'transparent', color: 'var(--faint)', border: '1px solid var(--border)',
                          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>
                          Cancel
                        </button>
                        {hasOverride && (
                          <button
                            onClick={() => revertToDefault(route.slug)}
                            disabled={saving}
                            style={{
                              fontSize: 12, fontWeight: 500, padding: '8px 12px', borderRadius: 8,
                              background: 'transparent', color: '#e05252', border: '1px solid #3d1a1a',
                              cursor: saving ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
                              marginLeft: 'auto',
                            }}
                          >
                            Revert to default
                          </button>
                        )}
                      </div>
                      {route.description && hasOverride && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--faint)', fontWeight: 600 }}>Default:</span> {route.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* File management row */}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* GPX replace */}
                    <input
                      type="file"
                      accept=".gpx"
                      ref={el => { gpxInputRefs.current[route.slug] = el }}
                      style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) uploadGpx(route.slug, f)
                      }}
                    />
                    <button
                      onClick={() => gpxInputRefs.current[route.slug]?.click()}
                      disabled={isGpxUploading}
                      style={smallBtn({
                        cursor: isGpxUploading ? 'wait' : 'pointer',
                        color: isGpxUploading ? 'var(--faint)' : 'var(--muted)',
                      })}
                    >
                      {isGpxUploading ? 'Uploading GPX...' : 'Replace GPX'}
                    </button>

                    {gpxSt && (
                      <span style={{ fontSize: 12, color: gpxSt.ok ? '#4caf76' : '#e05252' }}>
                        {gpxSt.msg}
                      </span>
                    )}

                    {/* Map image toggle */}
                    <button
                      onClick={() => toggleMapUpload(route.slug)}
                      disabled={isImgUploading}
                      style={smallBtn({ marginLeft: 4 })}
                    >
                      {mapExpanded ? 'Hide map images' : 'Update map image'}
                    </button>

                    {imgSt && (
                      <span style={{ fontSize: 12, color: imgSt.ok ? '#4caf76' : '#e05252' }}>
                        {imgSt.msg}
                      </span>
                    )}
                  </div>

                  {/* Map image upload (expanded) */}
                  {mapExpanded && (
                    <div style={{
                      marginTop: 10, padding: '12px 14px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 8,
                    }}>
                      <p style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 10 }}>
                        Upload replacement .webp images. Run <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>generate_route_maps.py {route.slug}</code> locally to generate them.
                      </p>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dark</span>
                          <input
                            type="file"
                            accept=".webp,image/webp"
                            ref={el => { darkImgRefs.current[route.slug] = el }}
                            style={{ fontSize: 12, color: 'var(--muted)' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Light</span>
                          <input
                            type="file"
                            accept=".webp,image/webp"
                            ref={el => { lightImgRefs.current[route.slug] = el }}
                            style={{ fontSize: 12, color: 'var(--muted)' }}
                          />
                        </label>
                      </div>
                      <button
                        onClick={() => uploadMapImages(route.slug)}
                        disabled={isImgUploading}
                        style={smallBtn({
                          background: '#1a1a1a',
                          cursor: isImgUploading ? 'wait' : 'pointer',
                        })}
                      >
                        {isImgUploading ? 'Uploading...' : 'Upload images'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
