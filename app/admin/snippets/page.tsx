'use client'
import { useState, useEffect, CSSProperties } from 'react'
import AdminShell from '@/components/AdminShell'

interface Snippet {
  id: string
  title: string
  body: string
  active: boolean
  created_at: string
}

const INPUT: CSSProperties = {
  width: '100%', background: '#0a0a0a', border: '1px solid #222',
  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
}
const TEXTAREA: CSSProperties = { ...INPUT, resize: 'vertical', minHeight: 100, lineHeight: 1.7 }
const LABEL: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, fontFamily: 'Inter, sans-serif' }

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<Snippet | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm]         = useState({ title: '', body: '', active: true })
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/snippets')
    const data = await res.json()
    setSnippets(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startCreate = () => {
    setForm({ title: '', body: '', active: true })
    setEditing(null)
    setCreating(true)
  }

  const startEdit = (s: Snippet) => {
    setForm({ title: s.title, body: s.body, active: s.active })
    setEditing(s)
    setCreating(false)
  }

  const cancel = () => { setEditing(null); setCreating(false) }

  const save = async () => {
    setSaving(true)
    try {
      if (creating) {
        const res = await fetch('/api/admin/snippets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        showToast('✓ Snippet created')
        setCreating(false)
      } else if (editing) {
        const res = await fetch(`/api/admin/snippets/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        showToast('✓ Saved')
        setEditing(null)
      }
      await load()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: Snippet) => {
    await fetch(`/api/admin/snippets/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !s.active }),
    })
    await load()
  }

  const del = async (s: Snippet) => {
    if (!confirm(`Delete "${s.title}"?`)) return
    await fetch(`/api/admin/snippets/${s.id}`, { method: 'DELETE' })
    showToast('Deleted')
    await load()
  }

  const userEmail = '' // fetched client-side — AdminShell handles display

  return (
    <AdminShell userEmail={userEmail}>
      <main style={{ flex: 1, padding: 32, maxWidth: 800 }}>

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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
          <div>
            <a href="/admin/emails" style={{ fontSize: 12, color: '#555', textDecoration: 'none' }}>← Back to emails</a>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>Message snippets</h1>
            <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
              Pre-written messages you can insert into the custom message field when composing an email.
              Toggle active/inactive to control which appear in the composer — useful for seasonal messages like lights reminders.
            </p>
          </div>
          {!creating && !editing && (
            <button
              onClick={startCreate}
              style={{ flexShrink: 0, background: '#f5a623', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + New snippet
            </button>
          )}
        </div>

        {/* Create / Edit form */}
        {(creating || editing) && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ccc', marginBottom: 20 }}>
              {creating ? 'New snippet' : `Editing: ${editing?.title}`}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Lights reminder"
                style={INPUT}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Message body</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="The message text..."
                rows={5}
                style={TEXTAREA}
              />
            </div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                style={{ accentColor: '#f5a623', width: 16, height: 16 }}
              />
              <label htmlFor="active" style={{ fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
                Active — show in email composer
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={save}
                disabled={saving || !form.title.trim() || !form.body.trim()}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#f5a623', border: 'none', color: '#0a0a0a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancel}
                style={{ padding: '10px 18px', borderRadius: 8, background: 'transparent', border: '1px solid #333', color: '#888', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Snippet list */}
        {loading ? (
          <p style={{ color: '#555', fontSize: 14 }}>Loading…</p>
        ) : snippets.length === 0 ? (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 12 }}>No snippets yet.</p>
            <button onClick={startCreate} style={{ background: 'none', border: 'none', color: '#f5a623', fontSize: 13, cursor: 'pointer' }}>
              Create your first snippet →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {snippets.map(s => (
              <div key={s.id} style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px',
                opacity: s.active ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.title}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: s.active ? '#0a1a0a' : '#1a1a1a',
                        color: s.active ? '#7cb87c' : '#555',
                        border: `1px solid ${s.active ? '#7cb87c33' : '#33333333'}`,
                      }}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.body}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleActive(s)}
                      style={{ padding: '6px 12px', borderRadius: 6, background: 'transparent', border: '1px solid #222', color: '#888', fontSize: 12, cursor: 'pointer' }}
                    >
                      {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => startEdit(s)}
                      style={{ padding: '6px 12px', borderRadius: 6, background: 'transparent', border: '1px solid #222', color: '#888', fontSize: 12, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => del(s)}
                      style={{ padding: '6px 12px', borderRadius: 6, background: 'transparent', border: '1px solid #2a1010', color: '#664', fontSize: 12, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </AdminShell>
  )
}
