'use client'

import { useState, useRef } from 'react'

type Settings = {
  hero_image_url: string | null
  sync_thursday_sheet: boolean
  sync_social_sheet: boolean
}

export default function SettingsClient({ initial }: { initial: Settings }) {
  const [heroUrl,       setHeroUrl]       = useState(initial.hero_image_url ?? '')
  const [syncThursday,  setSyncThursday]  = useState(initial.sync_thursday_sheet)
  const [syncSocial,    setSyncSocial]    = useState(initial.sync_social_sheet)
  const [saving,        setSaving]        = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [preview,       setPreview]       = useState<string | null>(initial.hero_image_url)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately while uploading
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed')

      const { url } = await res.json()
      setHeroUrl(url)
      setPreview(url)

      // Auto-save the new URL immediately after upload
      const saveRes = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_image_url: url }),
      })
      if (!saveRes.ok) throw new Error('Image uploaded but failed to save — click Save settings to retry')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Upload failed')
      setPreview(initial.hero_image_url)
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_image_url:      heroUrl.trim() || null,
          sync_thursday_sheet: syncThursday,
          sync_social_sheet:   syncSocial,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleRow = (label: string, sub: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #1a1a1a' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#ccc', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#555' }}>{sub}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: checked ? '#f5a623' : '#222', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
        aria-label={label}
      >
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
    </div>
  )

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24 }}>

      {/* Hero image upload */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>
          Hero image
        </p>

        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', height: 160, position: 'relative', background: '#0a0a0a' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Hero preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: '#f5a623' }}>Uploading…</p>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ccc', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            {uploading ? 'Uploading…' : preview ? 'Replace image' : 'Upload image'}
          </button>
          {preview && (
            <button
              onClick={() => { setPreview(null); setHeroUrl('') }}
              style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#555', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              Remove
            </button>
          )}
          <p style={{ fontSize: 11, color: '#444' }}>JPG, PNG or WebP · landscape recommended</p>
        </div>
      </div>

      {/* Sync toggles */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>
          Sync sources
        </p>
        {toggleRow('Thursday runs sheet', 'Syncs weekly 8k/5k groups from Google Sheets', syncThursday, setSyncThursday)}
        {toggleRow('Social & bank holiday sheet', 'Syncs social runs — disable if not yet published on Clubspark', syncSocial, setSyncSocial)}
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={save}
          disabled={saving || uploading}
          style={{ background: '#f5a623', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: (saving || uploading) ? 'not-allowed' : 'pointer', opacity: (saving || uploading) ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <p style={{ fontSize: 13, color: '#4caf76' }}>Saved ✓</p>}
        {error && <p style={{ fontSize: 13, color: '#e05c5c' }}>{error}</p>}
      </div>
    </div>
  )
}
