'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Snippet {
  id: string
  title: string
  body: string
  active: boolean
}

interface RunOption {
  date: string      // ISO date
  label: string     // display label e.g. "Thu 1 May — 5K & 8K"
}

interface EmailDraft {
  id?: string
  thursday_date:    string | null
  scheduled_for:    string | null
  status:           string
  subject:          string
  show_opening:     boolean
  opening_text:     string
  show_route_block: boolean
  custom_text:      string
  show_closing:     boolean
  closing_text:     string
  recipient_filter: string
  recipient_count?: number | null
  sent_at?:         string | null
}

interface Props {
  draft:      EmailDraft
  runOptions: RunOption[]
  isNew:      boolean
}

const INPUT = {
  width: '100%', background: '#0a0a0a', border: '1px solid #222',
  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
}
const TEXTAREA = { ...INPUT, resize: 'vertical' as const, minHeight: 100, lineHeight: 1.7 }
const LABEL = { display: 'block' as const, fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, fontFamily: 'Inter, sans-serif' }

function Section({ title, color = '#f5a623', children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, background: color, borderRadius: 2, display: 'inline-block' }} />
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ccc' }}>{title}</p>
      </div>
      <div style={{ padding: '20px 20px' }}>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
          background: checked ? '#f5a623' : '#222', transition: 'background 0.2s', position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: checked ? '#ccc' : '#555' }}>{label}</span>
    </label>
  )
}

export default function EmailComposer({ draft: initial, runOptions, isNew }: Props) {
  const router = useRouter()
  const isSent = initial.status === 'sent'

  const [draft, setDraft] = useState<EmailDraft>(initial)
  const [saving,   setSaving]   = useState(false)
  const [sending,  setSending]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const previewRef = useRef<HTMLIFrameElement>(null)
  const [snippets, setSnippets]           = useState<Snippet[]>([])
  const [snippetMenuOpen, setSnippetMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/snippets')
      .then(r => r.json())
      .then(d => setSnippets(Array.isArray(d) ? d.filter((s: Snippet) => s.active) : []))
      .catch(() => {})
  }, [])

  const insertSnippet = (body: string) => {
    const current = draft.custom_text ?? ''
    const joined  = current.trim() ? `${current.trim()}\n\n${body}` : body
    set('custom_text', joined)
    setSnippetMenuOpen(false)
  }

  const set = (field: keyof EmailDraft, value: unknown) =>
    setDraft(d => ({ ...d, [field]: value }))

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Save draft (create or update)
  const save = useCallback(async (andSend = false, andSchedule = false) => {
    setSaving(true)
    try {
      const payload = {
        thursday_date:    draft.thursday_date,
        scheduled_for:    (andSchedule && draft.scheduled_for) ? draft.scheduled_for : draft.scheduled_for,
        status:           andSchedule && draft.scheduled_for ? 'scheduled' : (isSent ? 'sent' : 'draft'),
        subject:          draft.subject,
        show_opening:     draft.show_opening,
        opening_text:     draft.opening_text,
        show_route_block: draft.show_route_block,
        custom_text:      draft.custom_text,
        show_closing:     draft.show_closing,
        closing_text:     draft.closing_text,
        recipient_filter: draft.recipient_filter,
      }

      let savedId = draft.id

      if (isNew) {
        const res  = await fetch('/api/admin/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Save failed')
        savedId = data.id
        setDraft(d => ({ ...d, id: savedId, status: payload.status }))
      } else {
        const res  = await fetch(`/api/admin/emails/${draft.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Save failed')
        setDraft(d => ({ ...d, status: payload.status }))
      }

      if (andSend && savedId) {
        setSaving(false)
        setSending(true)
        const res  = await fetch(`/api/admin/emails/${savedId}/send`, { method: 'POST' })
        const data = await res.json()
        setSending(false)
        if (!res.ok) throw new Error(data.error ?? 'Send failed')
        showToast(`✓ Sent to ${data.sent} runner${data.sent !== 1 ? 's' : ''}`)
        router.push('/admin/emails')
        return
      }

      if (isNew && savedId) {
        router.push(`/admin/emails/${savedId}`)
        return
      }

      showToast(andSchedule ? '✓ Scheduled' : '✓ Saved')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }, [draft, isNew, isSent, router])

  // Preview
  const loadPreview = useCallback(async () => {
    const id = draft.id ?? 'new'
    const res = await fetch(`/api/admin/emails/${id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thursday_date:    draft.thursday_date,
        subject:          draft.subject,
        show_opening:     draft.show_opening,
        opening_text:     draft.opening_text,
        show_route_block: draft.show_route_block,
        custom_text:      draft.custom_text,
        show_closing:     draft.show_closing,
        closing_text:     draft.closing_text,
      }),
    })
    const html = await res.text()
    setPreviewHtml(html)
  }, [draft])

  useEffect(() => {
    if (previewOpen) loadPreview()
  }, [previewOpen, loadPreview])

  useEffect(() => {
    if (previewRef.current && previewHtml) {
      const doc = previewRef.current.contentDocument
      if (doc) { doc.open(); doc.write(previewHtml); doc.close() }
    }
  }, [previewHtml])

  const deleteEmail = async () => {
    if (!draft.id || !confirm('Delete this email draft?')) return
    setDeleting(true)
    await fetch(`/api/admin/emails/${draft.id}`, { method: 'DELETE' })
    router.push('/admin/emails')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'ok' ? '#0a1a0a' : '#1a0a0a',
          border: `1px solid ${toast.type === 'ok' ? '#7cb87c' : '#e05252'}`,
          color: toast.type === 'ok' ? '#7cb87c' : '#e05252',
          padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Preview modal */}
      {previewOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, overflow: 'hidden', width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #1a1a1a' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>Email preview</p>
              <button onClick={() => setPreviewOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <iframe ref={previewRef} style={{ flex: 1, border: 'none', background: '#fff', minHeight: 500 }} title="Email preview" />
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: 32, maxWidth: 800 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12 }}>
          <div>
            <a href="/admin/emails" style={{ fontSize: 12, color: '#555', textDecoration: 'none' }}>← All emails</a>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>
              {isNew ? 'Compose email' : isSent ? 'Sent email' : 'Edit draft'}
            </h1>
          </div>
          {isSent && (
            <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 8, padding: '8px 16px' }}>
              <p style={{ fontSize: 12, color: '#7cb87c', fontWeight: 600 }}>
                ✓ Sent {initial.sent_at ? new Date(initial.sent_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : ''}
                {initial.recipient_count ? ` · ${initial.recipient_count} recipients` : ''}
              </p>
            </div>
          )}
        </div>

        {/* ── Scheduling ── */}
        <Section title="Scheduling">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={LABEL}>Run / Thursday date</label>
              <select
                value={draft.thursday_date ?? ''}
                onChange={e => set('thursday_date', e.target.value || null)}
                disabled={isSent}
                style={{ ...INPUT, appearance: 'none' as const }}
              >
                <option value="">— No run attached —</option>
                {runOptions.map(r => (
                  <option key={r.date} value={r.date}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL}>Scheduled send (optional)</label>
              <input
                type="datetime-local"
                value={draft.scheduled_for ? draft.scheduled_for.slice(0, 16) : ''}
                onChange={e => set('scheduled_for', e.target.value ? new Date(e.target.value).toISOString() : null)}
                disabled={isSent}
                style={INPUT}
              />
            </div>
          </div>
          <div>
            <label style={LABEL}>Subject line</label>
            <input
              type="text"
              value={draft.subject}
              onChange={e => set('subject', e.target.value)}
              disabled={isSent}
              placeholder="This Thursday with RTR 🏃"
              style={INPUT}
            />
          </div>
        </Section>

        {/* ── Opening ── */}
        <Section title="Opening" color="#f5a623">
          <Toggle
            checked={draft.show_opening}
            onChange={v => set('show_opening', v)}
            label="Include opening section"
          />
          {draft.show_opening && (
            <div>
              <label style={LABEL}>Opening text</label>
              <textarea
                value={draft.opening_text}
                onChange={e => set('opening_text', e.target.value)}
                disabled={isSent}
                rows={5}
                style={TEXTAREA}
              />
            </div>
          )}
        </Section>

        {/* ── Route block ── */}
        <Section title="Run details" color="#6b9fd4">
          <Toggle
            checked={draft.show_route_block}
            onChange={v => set('show_route_block', v)}
            label="Include this week's run details (auto-populated from the selected Thursday)"
          />
          {draft.show_route_block && !draft.thursday_date && (
            <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>Select a Thursday date above to preview the run details.</p>
          )}
          {draft.show_route_block && draft.thursday_date && (
            <p style={{ fontSize: 13, color: '#7cb87c', marginTop: 8 }}>✓ Will include all runs for {draft.thursday_date} with descriptions and route links.</p>
          )}
        </Section>

        {/* ── Custom text ── */}
        <Section title="Custom message" color="#c4a8e8">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...LABEL, marginBottom: 0 }}>Additional message (optional)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {snippets.length > 0 && !isSent && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setSnippetMenuOpen(o => !o)}
                    style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: '1px solid #333', color: '#888', fontSize: 12, cursor: 'pointer' }}
                  >
                    Insert snippet ▾
                  </button>
                  {snippetMenuOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: 4,
                      background: '#111', border: '1px solid #222', borderRadius: 8, minWidth: 220,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)', overflow: 'hidden',
                    }}>
                      {snippets.map(s => (
                        <button
                          key={s.id}
                          onClick={() => insertSnippet(s.body)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                            background: 'none', border: 'none', borderBottom: '1px solid #1a1a1a',
                            color: '#ccc', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <a href="/admin/snippets" style={{ fontSize: 11, color: '#444', textDecoration: 'none' }}>
                Manage snippets →
              </a>
            </div>
          </div>
          <textarea
            value={draft.custom_text}
            onChange={e => set('custom_text', e.target.value)}
            disabled={isSent}
            placeholder="Any extra info — kit nights, race shoutouts, announcements..."
            rows={4}
            style={TEXTAREA}
          />
        </Section>

        {/* ── Closing ── */}
        <Section title="Closing" color="#f5a623">
          <Toggle
            checked={draft.show_closing}
            onChange={v => set('show_closing', v)}
            label="Include closing section"
          />
          {draft.show_closing && (
            <div>
              <label style={LABEL}>Closing text</label>
              <textarea
                value={draft.closing_text}
                onChange={e => set('closing_text', e.target.value)}
                disabled={isSent}
                rows={4}
                style={TEXTAREA}
              />
            </div>
          )}
        </Section>

        {/* ── Recipients ── */}
        <Section title="Recipients">
          <label style={LABEL}>Send to</label>
          <select
            value={draft.recipient_filter}
            onChange={e => set('recipient_filter', e.target.value)}
            disabled={isSent}
            style={{ ...INPUT, appearance: 'none' as const }}
          >
            <option value="all">All registered runners</option>
            <option value="c25k" disabled>C25K cohort (coming soon)</option>
          </select>
        </Section>

        {/* ── Actions ── */}
        {!isSent && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <button
              onClick={() => { setPreviewOpen(true) }}
              style={{ padding: '10px 18px', borderRadius: 8, background: 'transparent', border: '1px solid #333', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Preview
            </button>
            <button
              onClick={() => save(false, false)}
              disabled={saving}
              style={{ padding: '10px 18px', borderRadius: 8, background: '#1a1a1a', border: '1px solid #333', color: '#ccc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            {draft.scheduled_for && (
              <button
                onClick={() => save(false, true)}
                disabled={saving}
                style={{ padding: '10px 18px', borderRadius: 8, background: '#0d1a2a', border: '1px solid #6b9fd4', color: '#6b9fd4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Schedule send
              </button>
            )}
            <button
              onClick={() => {
                if (confirm('Send this email to all registered runners now?')) save(true, false)
              }}
              disabled={sending || saving}
              style={{ padding: '10px 20px', borderRadius: 8, background: '#f5a623', border: 'none', color: '#0a0a0a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {sending ? 'Sending…' : 'Send now'}
            </button>
            {!isNew && (
              <button
                onClick={deleteEmail}
                disabled={deleting}
                style={{ marginLeft: 'auto', padding: '10px 14px', borderRadius: 8, background: 'transparent', border: '1px solid #2a1010', color: '#664', fontSize: 12, cursor: 'pointer' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
