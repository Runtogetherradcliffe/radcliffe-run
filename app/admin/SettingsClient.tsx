'use client'

import { useState, useRef } from 'react'

// Session order: { "6": [tuesdayIdx, thursdayIdx, soloIdx], "7": [...] }
// Indices refer to position in the canonical sessions array for that week
type SessionOrder = { [week: string]: [number, number, number] }

type Settings = {
  hero_image_url: string | null
  sync_thursday_sheet: boolean
  sync_social_sheet: boolean
  show_social_calendar: boolean
  email_default_subject: string | null
  email_default_opening: string | null
  email_default_closing: string | null
  c25k_enabled: boolean
  c25k_registration_open: boolean
  c25k_start_date: string | null
  c25k_cohort_label: string | null
  c25k_max_registrations: number | null
  c25k_session_order: SessionOrder | null
}

// Canonical session descriptions for the two varying weeks
const VARYING_WEEKS: { n: number; title: string; sessions: { label: string; short: string }[] }[] = [
  {
    n: 6, title: 'Week 6 — 20-min milestone',
    sessions: [
      { label: 'Run 1 — 5+5+5 min intervals',  short: '5+5+5 (15 min)' },
      { label: 'Run 2 — 8+8 min intervals',     short: '8+8 (16 min)' },
      { label: 'Run 3 — 20 min non-stop',       short: '20 min non-stop' },
    ],
  },
  {
    n: 7, title: 'Week 7 — Stretch to 25 min',
    sessions: [
      { label: 'Run 1 — 5+8+5 min intervals',  short: '5+8+5 (18 min)' },
      { label: 'Run 2 — 10+10 min intervals',   short: '10+10 (20 min)' },
      { label: 'Run 3 — 25 min non-stop',       short: '25 min non-stop' },
    ],
  },
]

export default function SettingsClient({ initial }: { initial: Settings }) {
  const [heroUrl,            setHeroUrl]            = useState(initial.hero_image_url ?? '')
  const [syncThursday,       setSyncThursday]       = useState(initial.sync_thursday_sheet)
  const [syncSocial,         setSyncSocial]         = useState(initial.sync_social_sheet)
  const [showSocialCalendar, setShowSocialCalendar] = useState(initial.show_social_calendar)
  const [emailSubject,       setEmailSubject]       = useState(initial.email_default_subject ?? '')
  const [emailOpening,       setEmailOpening]       = useState(initial.email_default_opening ?? '')
  const [emailClosing,       setEmailClosing]       = useState(initial.email_default_closing ?? '')
  const [c25kEnabled,        setC25kEnabled]        = useState(initial.c25k_enabled)
  const [c25kRegOpen,        setC25kRegOpen]        = useState(initial.c25k_registration_open)
  const [c25kStartDate,      setC25kStartDate]      = useState(initial.c25k_start_date ?? '')
  const [c25kCohortLabel,    setC25kCohortLabel]    = useState(initial.c25k_cohort_label ?? '')
  const [c25kMaxReg,         setC25kMaxReg]         = useState<string>(initial.c25k_max_registrations?.toString() ?? '')
  const [c25kSessionOrder,   setC25kSessionOrder]   = useState<SessionOrder>(
    initial.c25k_session_order ?? { '6': [0, 1, 2], '7': [0, 1, 2] }
  )
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
          hero_image_url:        heroUrl.trim() || null,
          sync_thursday_sheet:   syncThursday,
          sync_social_sheet:     syncSocial,
          show_social_calendar:  showSocialCalendar,
          email_default_subject: emailSubject.trim(),
          email_default_opening: emailOpening.trim(),
          email_default_closing: emailClosing.trim(),
          c25k_enabled:             c25kEnabled,
          c25k_registration_open:   c25kRegOpen,
          c25k_start_date:          c25kStartDate.trim() || null,
          c25k_cohort_label:        c25kCohortLabel.trim() || null,
          c25k_max_registrations:   c25kMaxReg.trim() ? parseInt(c25kMaxReg, 10) : null,
          c25k_session_order:       c25kSessionOrder,
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</p>
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
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>

      {/* Hero image upload */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
          Hero image
        </p>

        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', height: 160, position: 'relative', background: 'var(--bg)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Hero preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: '#f5a623' }}>Uploading…</p>
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
            style={{ background: 'var(--card-hi)', border: '1px solid var(--border-2)', color: 'var(--dim)', borderRadius: 8, padding: '9px 16px', fontSize: 'var(--text-sm)', fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            {uploading ? 'Uploading…' : preview ? 'Replace image' : 'Upload image'}
          </button>
          {preview && (
            <button
              onClick={() => { setPreview(null); setHeroUrl('') }}
              style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--muted)', borderRadius: 8, padding: '9px 16px', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              Remove
            </button>
          )}
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>JPG, PNG or WebP · landscape recommended</p>
        </div>
      </div>

      {/* Sync toggles */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          Sync sources
        </p>
        {toggleRow('Thursday runs sheet', 'Syncs weekly 8k/5k groups from Google Sheets', syncThursday, setSyncThursday)}
        {toggleRow('Social & bank holiday sheet', 'Syncs social runs — disable if not yet published on Clubspark', syncSocial, setSyncSocial)}
        {toggleRow('Social runs calendar button', 'Shows the "Social runs →" calendar subscription button on the homepage', showSocialCalendar, setShowSocialCalendar)}
      </div>

      {/* Email defaults */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
          Email defaults
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Pre-filled when composing a new email. Can be overridden per-email in the composer.
        </p>
        {[
          { label: 'Default subject', value: emailSubject, set: setEmailSubject, placeholder: "This Thursday — radcliffe.run 🏃", rows: 1 },
          { label: 'Default opening', value: emailOpening, set: setEmailOpening, placeholder: "Hi everyone,\n\nHere's what's happening this Thursday…", rows: 4 },
          { label: 'Default closing', value: emailClosing, set: setEmailClosing, placeholder: "See you out there!\n\nradcliffe.run", rows: 4 },
        ].map(({ label, value, set, placeholder, rows }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>{label}</p>
            <textarea
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--dim)',
                fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical',
                lineHeight: 1.6, boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>

      {/* C25K settings */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          Couch to 5K
        </p>
        {toggleRow('Show C25K section', 'Makes /c25k visible. When off, the page returns a 404.', c25kEnabled, setC25kEnabled)}
        {toggleRow('Registration open', 'Allows new registrations via /join?c25k=true. Turn off after the cohort starts if needed.', c25kRegOpen, setC25kRegOpen)}
        <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Cohort label <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></p>
            <input
              type="text"
              value={c25kCohortLabel}
              onChange={e => setC25kCohortLabel(e.target.value)}
              placeholder="e.g. Spring 2026"
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--dim)',
                fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Start date <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional — shown on /c25k page)</span></p>
            <input
              type="date"
              value={c25kStartDate}
              onChange={e => setC25kStartDate(e.target.value)}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border-2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--dim)',
                fontFamily: 'Inter, sans-serif', outline: 'none', colorScheme: 'dark',
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Max registrations <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional — leave blank for no limit)</span></p>
            <input
              type="number"
              min={1}
              value={c25kMaxReg}
              onChange={e => setC25kMaxReg(e.target.value)}
              placeholder="e.g. 20"
              style={{
                width: 120, background: 'var(--bg)', border: '1px solid var(--border-2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--dim)',
                fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Session order for varying weeks */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Session order</p>
          <p style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
            For weeks 6 and 7, assign which run goes on each day. The longest run shouldn&rsquo;t be left as the solo session.
          </p>
          {VARYING_WEEKS.map(wk => {
            const order = c25kSessionOrder[wk.n.toString()] ?? [0, 1, 2]
            const slots: { key: 0 | 1 | 2; label: string }[] = [
              { key: 0, label: 'Tuesday group' },
              { key: 1, label: 'Thursday group' },
              { key: 2, label: 'Solo run' },
            ]
            const selectStyle: React.CSSProperties = {
              background: 'var(--bg)', border: '1px solid var(--border-2)',
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--dim)',
              fontFamily: 'Inter, sans-serif', outline: 'none', colorScheme: 'dark',
              width: '100%', cursor: 'pointer',
            }
            return (
              <div key={wk.n} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>{wk.title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {slots.map(slot => (
                    <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)', width: 108, flexShrink: 0 }}>{slot.label}</span>
                      <select
                        value={order[slot.key]}
                        onChange={e => {
                          const newIdx = parseInt(e.target.value, 10)
                          const newOrder: [number, number, number] = [...order] as [number, number, number]
                          // Swap with whatever slot currently holds newIdx
                          const swapSlot = newOrder.indexOf(newIdx)
                          if (swapSlot !== -1) newOrder[swapSlot] = newOrder[slot.key]
                          newOrder[slot.key] = newIdx
                          setC25kSessionOrder({ ...c25kSessionOrder, [wk.n.toString()]: newOrder })
                        }}
                        style={selectStyle}
                      >
                        {wk.sessions.map((s, i) => (
                          <option key={i} value={i}>{s.short}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={save}
          disabled={saving || uploading}
          style={{ background: '#f5a623', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: (saving || uploading) ? 'not-allowed' : 'pointer', opacity: (saving || uploading) ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <p style={{ fontSize: 'var(--text-sm)', color: '#4caf76' }}>Saved ✓</p>}
        {error && <p style={{ fontSize: 'var(--text-sm)', color: '#e05c5c' }}>{error}</p>}
      </div>
    </div>
  )
}
