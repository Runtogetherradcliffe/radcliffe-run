'use client'

import { useState, useEffect, ReactNode, CSSProperties } from 'react'
import SignOutButton from './SignOutButton'
import { applyTheme } from '@/components/ThemeProvider'

type Member = {
  first_name: string
  last_name: string
  email: string
  mobile: string | null
  emergency_name: string
  emergency_phone: string
  emergency_relationship: string
  medical_info: string | null
  email_opt_out: boolean
  photo_consent: boolean
  theme: string
  font_size: string
}

type PushState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

const INPUT: CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)',
  borderRadius: 8, padding: '10px 14px', fontSize: 'var(--text-base)', color: 'var(--white)',
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
}
const LABEL: CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)',
  marginBottom: 6, fontFamily: 'Inter, sans-serif',
}

function Section({ title, onEdit, editing, children }: {
  title: string
  onEdit?: () => void
  editing?: boolean
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
          {title}
        </p>
        {onEdit && !editing && (
          <button
            onClick={onEdit}
            style={{
              background: 'none', border: '1px solid var(--border-2)', borderRadius: 6,
              padding: '4px 10px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Edit
          </button>
        )}
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 20px', borderBottom: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', flexShrink: 0, marginRight: 16 }}>{label}</p>
      <p style={{ fontSize: 'var(--text-sm)', color: muted ? 'var(--faint)' : 'var(--dim)', textAlign: 'right' }}>{value}</p>
    </div>
  )
}

function Toggle({ enabled, onChange, loading }: { enabled: boolean; onChange: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      aria-label="Toggle"
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', flexShrink: 0,
        cursor: loading ? 'default' : 'pointer',
        background: enabled ? '#f5a623' : 'var(--border-2)',
        position: 'relative', transition: 'background 0.2s',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: enabled ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: 'var(--card)', transition: 'left 0.2s',
      }} />
    </button>
  )
}

export default function ProfileClient({ member: initial }: { member: Member }) {
  const [member, setMember] = useState<Member>(initial)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [form, setForm] = useState({ ...initial })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [emailToggling, setEmailToggling] = useState(false)
  const [photoToggling, setPhotoToggling] = useState(false)
  const [pushState, setPushState] = useState<PushState>('loading')
  const [pushLoading, setPushLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [appearanceSaving, setAppearanceSaving] = useState(false)

  // ── Sync DB preferences to localStorage on mount ─────────────────
  useEffect(() => {
    localStorage.setItem('rtr-theme',    member.theme)
    localStorage.setItem('rtr-fontsize', member.font_size)
    applyTheme(member.theme, member.font_size)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Check push subscription state on mount ──────────────────────
  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setPushState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setPushState('denied')
      return
    }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      setPushState(sub ? 'subscribed' : 'unsubscribed')
    }).catch(() => setPushState('unsupported'))
  }, [])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Save a section ──────────────────────────────────────────────
  const saveSection = async (fields: Partial<Member>) => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMember(m => ({ ...m, ...fields }))
      setEditSection(null)
      showToast('✓ Saved')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error saving', 'err')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setForm({ ...member })
    setEditSection(null)
  }

  const startEdit = (section: string) => {
    setForm({ ...member })
    setEditSection(section)
  }

  // ── Email opt-out toggle ────────────────────────────────────────
  const toggleEmail = async () => {
    setEmailToggling(true)
    const next = !member.email_opt_out
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_opt_out: next }),
      })
      if (!res.ok) throw new Error()
      setMember(m => ({ ...m, email_opt_out: next }))
    } catch {
      showToast('Failed to update email preference', 'err')
    } finally {
      setEmailToggling(false)
    }
  }

  // ── Photo consent toggle ────────────────────────────────────────
  const togglePhoto = async () => {
    setPhotoToggling(true)
    const next = !member.photo_consent
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_consent: next }),
      })
      if (!res.ok) throw new Error()
      setMember(m => ({ ...m, photo_consent: next }))
    } catch {
      showToast('Failed to update photo preference', 'err')
    } finally {
      setPhotoToggling(false)
    }
  }

  // ── Push notification toggle ────────────────────────────────────
  const togglePush = async () => {
    setPushLoading(true)
    try {
      if (pushState === 'subscribed') {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
        }
        setPushState('unsubscribed')
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setPushState('denied')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) await existing.unsubscribe()

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        const padding = '='.repeat((4 - vapidKey.length % 4) % 4)
        const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = atob(base64)
        const key = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; i++) key[i] = rawData.charCodeAt(i)

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        setPushState('subscribed')
      }
    } catch {
      showToast('Failed to update notification preference', 'err')
    } finally {
      setPushLoading(false)
    }
  }

  // ── Delete account ─────────────────────────────────────────────
  const deleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/profile', { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      // Redirect to home — session is gone, auth user deleted
      window.location.href = '/'
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to delete account', 'err')
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  // ── Appearance helpers ─────────────────────────────────────────
  const saveAppearance = async (update: { theme?: string; font_size?: string }) => {
    const next = { theme: member.theme, font_size: member.font_size, ...update }
    setAppearanceSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!res.ok) throw new Error()
      setMember(m => ({ ...m, ...next }))
      localStorage.setItem('rtr-theme',    next.theme)
      localStorage.setItem('rtr-fontsize', next.font_size)
      applyTheme(next.theme, next.font_size)
    } catch {
      showToast('Failed to save appearance preference', 'err')
    } finally {
      setAppearanceSaving(false)
    }
  }

  const f = (field: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'ok' ? 'var(--green-bg)' : '#1a0a0a',
          border: `1px solid ${toast.type === 'ok' ? '#7cb87c' : '#e05252'}`,
          color: toast.type === 'ok' ? '#7cb87c' : '#e05252',
          padding: '12px 20px', borderRadius: 10, fontSize: 'var(--text-base)', fontWeight: 600,
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Your details ── */}
      <Section title="Your details" onEdit={() => startEdit('details')} editing={editSection === 'details'}>
        {editSection === 'details' ? (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={LABEL}>First name</label>
                <input style={INPUT} value={form.first_name} onChange={f('first_name')} />
              </div>
              <div>
                <label style={LABEL}>Last name</label>
                <input style={INPUT} value={form.last_name} onChange={f('last_name')} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Mobile</label>
              <input style={INPUT} type="tel" value={form.mobile ?? ''} onChange={f('mobile')} placeholder="e.g. 07700 900000" />
            </div>
            <SaveCancel saving={saving} onSave={() => saveSection({ first_name: form.first_name, last_name: form.last_name, mobile: form.mobile || null })} onCancel={cancelEdit} />
          </div>
        ) : (
          <>
            <Row label="Name" value={`${member.first_name} ${member.last_name}`} />
            <Row label="Email" value={member.email} />
            <Row label="Mobile" value={member.mobile ?? 'Not provided'} muted={!member.mobile} />
          </>
        )}
      </Section>

      {/* ── Emergency contact ── */}
      <Section title="Emergency contact" onEdit={() => startEdit('emergency')} editing={editSection === 'emergency'}>
        {editSection === 'emergency' ? (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL}>Name</label>
              <input style={INPUT} value={form.emergency_name} onChange={f('emergency_name')} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL}>Relationship</label>
              <input style={INPUT} value={form.emergency_relationship} onChange={f('emergency_relationship')} placeholder="e.g. Partner, Parent" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Phone</label>
              <input style={INPUT} type="tel" value={form.emergency_phone} onChange={f('emergency_phone')} />
            </div>
            <SaveCancel saving={saving} onSave={() => saveSection({ emergency_name: form.emergency_name, emergency_relationship: form.emergency_relationship, emergency_phone: form.emergency_phone })} onCancel={cancelEdit} />
          </div>
        ) : (
          <>
            <Row label="Name" value={member.emergency_name} />
            <Row label="Relationship" value={member.emergency_relationship} />
            <Row label="Phone" value={member.emergency_phone} />
          </>
        )}
      </Section>

      {/* ── Medical info ── */}
      <Section title="Medical information" onEdit={() => startEdit('medical')} editing={editSection === 'medical'}>
        {editSection === 'medical' ? (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Notes (optional)</label>
              <textarea
                value={form.medical_info ?? ''}
                onChange={e => setForm(prev => ({ ...prev, medical_info: e.target.value }))}
                rows={4}
                placeholder="Any conditions, allergies or information run leaders should know"
                style={{ ...INPUT, resize: 'vertical' as const, minHeight: 100, lineHeight: 1.6 }}
              />
            </div>
            <SaveCancel saving={saving} onSave={() => saveSection({ medical_info: form.medical_info || null })} onCancel={cancelEdit} />
          </div>
        ) : (
          <Row
            label="Notes"
            value={member.medical_info ?? 'None provided'}
            muted={!member.medical_info}
          />
        )}
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance">
        {/* Theme */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)', marginBottom: 3 }}>Colour scheme</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Choose how the site looks to you</p>
          </div>
          <div style={{ display: 'flex', gap: 6, opacity: appearanceSaving ? 0.6 : 1 }}>
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                onClick={() => member.theme !== t && saveAppearance({ theme: t })}
                disabled={appearanceSaving}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 'var(--text-sm)', fontWeight: 600,
                  cursor: appearanceSaving ? 'default' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: member.theme === t ? '#f5a623' : 'transparent',
                  color:      member.theme === t ? '#0a0a0a' : 'var(--muted)',
                  border:     member.theme === t ? 'none' : '1px solid var(--border-2)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)', marginBottom: 3 }}>Text size</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Larger text may be easier to read</p>
          </div>
          <div style={{ display: 'flex', gap: 6, opacity: appearanceSaving ? 0.6 : 1 }}>
            {(['normal', 'large'] as const).map(s => (
              <button
                key={s}
                onClick={() => member.font_size !== s && saveAppearance({ font_size: s })}
                disabled={appearanceSaving}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 'var(--text-sm)', fontWeight: 600,
                  cursor: appearanceSaving ? 'default' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: member.font_size === s ? '#f5a623' : 'transparent',
                  color:      member.font_size === s ? '#0a0a0a' : 'var(--muted)',
                  border:     member.font_size === s ? 'none' : '1px solid var(--border-2)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {s === 'normal' ? 'Normal' : 'Larger'}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Preferences ── */}
      <Section title="Preferences">
        {/* Email */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)', marginBottom: 3 }}>Club emails</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Weekly run info and group announcements</p>
          </div>
          <Toggle enabled={!member.email_opt_out} onChange={toggleEmail} loading={emailToggling} />
        </div>

        {/* Photo consent */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)', marginBottom: 3 }}>Photo consent</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Allow group photos including you to be shared online</p>
          </div>
          <Toggle enabled={member.photo_consent} onChange={togglePhoto} loading={photoToggling} />
        </div>

        {/* Push */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)', marginBottom: 3 }}>App notifications</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {pushState === 'denied'
                ? 'Blocked in browser settings — enable in your device settings'
                : pushState === 'unsupported'
                ? 'Not supported on this browser or device'
                : 'Run reminders and group updates'}
            </p>
          </div>
          {pushState === 'denied' || pushState === 'unsupported' ? (
            <div style={{
              fontSize: 'var(--text-xs)', fontWeight: 600, padding: '4px 10px', borderRadius: 6,
              background: 'var(--card-hi)', color: 'var(--faint)', border: '1px solid var(--border)',
            }}>
              {pushState === 'denied' ? 'Blocked' : 'Unavailable'}
            </div>
          ) : (
            <Toggle
              enabled={pushState === 'subscribed'}
              onChange={togglePush}
              loading={pushState === 'loading' || pushLoading}
            />
          )}
        </div>
      </Section>

      <div style={{ marginTop: 8 }}>
        <SignOutButton />
      </div>

      {/* ── Danger zone ── */}
      <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 32 }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 16 }}>
          Danger zone
        </p>

        {!deleteConfirm ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>Delete my account</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              This permanently removes all your personal data, emergency contact details, and medical information from radcliffe.run. This cannot be undone.
            </p>
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{
                padding: '9px 18px', borderRadius: 8, background: 'transparent',
                border: '1px solid rgba(224,82,82,0.4)', color: '#e05252', fontSize: 'var(--text-sm)',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Delete my account
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 12, padding: '20px' }}>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#e05252', marginBottom: 8 }}>Are you sure?</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Your account, emergency contact, and any medical information will be permanently deleted. You will be signed out immediately and cannot undo this.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                style={{
                  padding: '9px 18px', borderRadius: 8, background: '#c0392b',
                  border: 'none', color: 'var(--white)', fontSize: 'var(--text-sm)', fontWeight: 700,
                  cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  padding: '9px 16px', borderRadius: 8, background: 'transparent',
                  border: '1px solid var(--border-2)', color: 'var(--muted)', fontSize: 'var(--text-sm)',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function SaveCancel({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '9px 20px', borderRadius: 8, background: '#f5a623',
          border: 'none', color: '#0a0a0a', fontSize: 'var(--text-sm)', fontWeight: 700,
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={onCancel}
        style={{
          padding: '9px 16px', borderRadius: 8, background: 'transparent',
          border: '1px solid var(--border-2)', color: 'var(--muted)', fontSize: 'var(--text-sm)',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}
      >
        Cancel
      </button>
    </div>
  )
}
