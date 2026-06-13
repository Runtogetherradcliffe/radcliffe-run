'use client'
import { useState } from 'react'
import { BASE_LAYERS, HISTORIC_LAYERS, HAS_MAPTILER, resolveLayer, type MapLayer } from '@/lib/mapLayers'

/**
 * Floating "Map" button + layer-picker dialog, shared by the routes library and
 * the run detail map. Renders absolutely positioned inside a position:relative
 * map container. Controlled via activeLayerId / onChange.
 */
export default function MapLayersControl({
  activeLayerId,
  terrain,
  onChange,
  top = 84,
  left = 10,
}: {
  activeLayerId: string
  terrain?: string
  onChange: (id: string) => void
  top?: number
  left?: number
}) {
  const [open, setOpen] = useState(false)
  const activeId = resolveLayer(activeLayerId, terrain).id

  const Option = ({ l, disabled }: { l: MapLayer; disabled?: boolean }) => {
    const active = activeId === l.id
    return (
      <button
        disabled={disabled}
        onClick={() => { if (!disabled) { onChange(l.id); setOpen(false) } }}
        style={{
          textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, sans-serif', padding: '8px 10px', borderRadius: 8,
          border: `1px solid ${active ? 'var(--orange)' : 'var(--border-2)'}`,
          background: active ? 'rgba(245,166,35,0.08)' : 'var(--card)',
          opacity: disabled ? 0.4 : 1, transition: 'all 0.12s',
        }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: active ? 'var(--orange)' : 'var(--white)' }}>{l.label}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 1 }}>{l.sub}</div>
      </button>
    )
  }

  return (
    <div style={{ position: 'absolute', top, left, zIndex: 1000 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Map layers"
        style={{
          display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 'var(--text-sm)', fontWeight: 600,
          color: 'var(--white)', padding: '8px 12px', borderRadius: 8,
          background: 'var(--overlay)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-2)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
        </svg>
        Map
      </button>

      {open && (
        <div style={{
          marginTop: 8, width: 248, padding: 12, borderRadius: 12,
          background: 'var(--overlay)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-2)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 8 }}>Base map</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {BASE_LAYERS.map(l => <Option key={l.id} l={l} />)}
          </div>

          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', margin: '14px 0 8px' }}>Historic Radcliffe</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {HISTORIC_LAYERS.map(l => <Option key={l.id} l={l} disabled={!HAS_MAPTILER} />)}
          </div>
          {!HAS_MAPTILER && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 8, lineHeight: 1.4 }}>
              Add a free MapTiler key to enable historic Ordnance Survey overlays.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
