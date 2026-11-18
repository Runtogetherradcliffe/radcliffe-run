'use client'

import { useState, useRef } from 'react'
import { EDITABLE_WEEKS, PROGRAMME, SLOT_KEYS, effectiveProgramme, type SessionOrder, type SlotKey, type SlotText, type WeekOverrides } from '@/lib/c25kProgramme'


type Settings = {
  hero_image_url: string | null
  weekly_note: string | null
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
  c25k_week_overrides: WeekOverrides | null
}

type WeekText = Record<string, Record<SlotKey, SlotText>>

/** Weeks 6 and 7 as Tuesday / Thursday / solo text, from a programme. */
function weekTextFrom(order: SessionOrder | null, overrides: WeekOverrides | null): WeekText {
  const programme = effectiveProgramme(order, overrides)
  const out: WeekText = {}
  for (const n of EDITABLE_WEEKS) {
    const w = programme.find(p => p.n === n)!
    out[String(n)] = Object.fromEntries(SLOT_KEYS.map((k, i) => [k, { intervals: w.sessions[i].intervals, totalRun: w.sessions[i].totalRun }])) as Record<SlotKey, SlotText>
  }
  return out
}
const SLOT_NAMES: Record<SlotKey, string> = { tue: 'Tuesday group', thu: 'Thursday group', solo: 'Solo run' }

export default function SettingsClient({ initial }: { initial: Settings }) {
  const [heroUrl,            setHeroUrl]            = useState(initial.hero_image_url ?? '')
  const [weeklyNote,         setWeeklyNote]         = useState(initial.weekly_note ?? '')
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
  // Kept as saved: weeks 6 and 7 are now edited as text, which starts from this order.
  const [c25kSessionOrder] = useState<SessionOrder>(
    initial.c25k_session_order ?? { '6': [0, 1, 2], '7': [0, 1, 2] }
  )
  const [c25kWeekText, setC25kWeekText] = useState<WeekText>(
    () => weekTextFrom(initial.c25k_session_order, initial.c25k_week_overrides)
  )
  const setSlot = (week: string, slot: SlotKey, field: keyof SlotText, value: string) =>
    setC25kWeekText(prev => ({ ...prev, [week]: { ...prev[week], [slot]: { ...prev[week][slot], [field]: value } } }))
  const resetWeek = (week: string) =>
    setC25kWeekText(prev => ({ ...prev, [week]: weekTextFrom({ [week]: [0, 1, 2] }, null)[week] }))
  const [c25kSessionsBusy,   setC25kSessionsBusy]   = useState(false)
  const ukDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const [c25kSessionsMsg,    setC25kSessionsMsg]    = useState<string | null>(null)

  // C25K sessions as runs rows (lib/c25kSessions.ts), built from the SAVED start date.
  async function createC25kSessions() {
    setC25kSessionsBusy(true)
    setC25kSessionsMsg(null)
    try {
      const res = await fetch('/api/admin/c25k/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: c25kStartDate.trim() || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 207) {
        setC25kSessionsMsg(body.error ?? `Failed (${res.status})`)
      } else {
        const errs = Array.isArray(body.errors) && body.errors.length ? ` ${body.errors.length} failed: ${body.errors[0]}` : ''
        setC25kSessionsMsg(`Done: ${body.inserted} created, ${body.updated} updated, for the cohort starting ${ukDate(body.start)}.${errs}`)
      }
    } catch {
      setC25kSessionsMsg('Could not reach the server. Try again.')
    } finally {
      setC25kSessionsBusy(false)
    }
  }
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
      if (!saveRes.ok) throw new Error('Image uploaded but failed to save - click Save settings to retry')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
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
          weekly_note:           weeklyNote.trim() || null,
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
          c25k_week_overrides:      c25kWeekText,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      // Edited week 6/7 runs reach C25K sessions that already exist. updateOnly never creates any.
      fetch('/api/admin/c25k/sessions?updateOnly=1', { method: 'POST' }).catch(() => {})
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
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

      {/* Weekly note - the app Home's admin-edited line */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          Weekly note
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          A short line for the app&apos;s Home - this week&apos;s route in a sentence, plus any club news.
          Shows until the morning after the last run scheduled in the week after you save it - so an
          ordinary week ends Friday morning, and a Sunday social keeps it up through the weekend.
          Clear the box and save to take it down early.
        </p>
        <textarea
          value={weeklyNote}
          onChange={e => setWeeklyNote(e.target.value)}
          placeholder={"This week we're out on the Banana Path - flat, fast and mostly puddle-free. Cake at the market after!"}
          rows={3}
          style={{
            width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)',
            borderRadius: 8, padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--dim)',
            fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical',
            lineHeight: 1.6, boxSizing: 'border-box',
          }}
        />
      </div>

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
        {toggleRow('Social & bank holiday sheet', 'Syncs social runs - disable if not yet published on Clubspark', syncSocial, setSyncSocial)}
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
          { label: 'Default subject', value: emailSubject, set: setEmailSubject, placeholder: "This Thursday - radcliffe.run 🏃", rows: 1 },
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
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Start date <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional - shown on /c25k page)</span></p>
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
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Max registrations <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional - leave blank for no limit)</span></p>
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
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Session schedule</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.5 }}>
              Uses the start date above (and saves it) to create the cohort&apos;s sessions: a Tuesday and a Thursday for each of the 10 weeks, and the graduation parkrun. Leaders check runners in against these. Pressing it again updates them, so it is safe to use after moving the start date.
            </p>
            <button
              type="button"
              onClick={createC25kSessions}
              disabled={c25kSessionsBusy || !c25kStartDate.trim()}
              style={{
                background: 'var(--card-hi)', border: '1px solid var(--border-2)', borderRadius: 8,
                padding: '9px 14px', fontSize: 'var(--text-sm)', color: 'var(--white)', cursor: c25kSessionsBusy ? 'wait' : !c25kStartDate.trim() ? 'not-allowed' : 'pointer', opacity: !c25kStartDate.trim() ? 0.5 : 1,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {c25kSessionsBusy ? 'Creating sessions...' : 'Create or update C25K sessions'}
            </button>
            {!c25kStartDate.trim() && (
              <p role="status" style={{ fontSize: 'var(--text-xs)', color: 'var(--orange)', margin: '8px 0 0' }}>Set a start date above first.</p>
            )}
            {c25kSessionsMsg && (
              <p role="status" style={{ fontSize: 'var(--text-xs)', color: 'var(--dim)', margin: '8px 0 0' }}>{c25kSessionsMsg}</p>
            )}
          </div>
        </div>

        {/* Weeks 6 and 7: the runs in the admin's own words (lib/c25kProgramme.ts) */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Weeks 6 and 7 runs</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
            Write each run as the cohort should see it. It shows on the programme page, on the sessions and in the C25K email. Saving updates any sessions already created.
          </p>
          {EDITABLE_WEEKS.map(n => {
            const week = String(n)
            const title = PROGRAMME.find(p => p.n === n)?.title ?? ''
            return (
              <div key={week} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Week {n} - {title}</p>
                  <button type="button" onClick={() => resetWeek(week)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 'var(--text-xs)', color: 'var(--orange)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Reset to NHS plan
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SLOT_KEYS.map(slot => (
                    <div key={slot} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)', gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)' }}>{SLOT_NAMES[slot]}</span>
                        <input
                          id={`c25k-w${week}-${slot}-intervals`}
                          type="text"
                          value={c25kWeekText[week][slot].intervals}
                          onChange={e => setSlot(week, slot, 'intervals', e.target.value)}
                          maxLength={200}
                          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '8px 12px', fontSize: 'var(--text-sm)', color: 'var(--dim)', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--faint)' }}>Running time</span>
                        <input
                          id={`c25k-w${week}-${slot}-total`}
                          type="text"
                          value={c25kWeekText[week][slot].totalRun}
                          onChange={e => setSlot(week, slot, 'totalRun', e.target.value)}
                          maxLength={200}
                          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '8px 12px', fontSize: 'var(--text-sm)', color: 'var(--dim)', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const }}
                        />
                      </label>
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
