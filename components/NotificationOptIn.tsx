'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const bytes = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i)
  return bytes
}

export default function NotificationOptIn() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    setPermission(Notification.permission)

    // Don't re-show if they previously dismissed without choosing
    if (sessionStorage.getItem('rtr-notif-dismissed')) setDismissed(true)
  }, [])

  // Don't render on server, or if not supported, or if already decided
  if (!permission || permission !== 'default' || dismissed) return null

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) { await existing.unsubscribe() }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      setPermission('granted')
    } catch (err) {
      console.error('Subscription error:', err)
      setPermission(Notification.permission)
    } finally {
      setLoading(false)
      // Always dismiss — the user has made a choice, don't leave the banner hanging
      setDismissed(true)
      sessionStorage.setItem('rtr-notif-dismissed', '1')
    }
  }

  function dismiss() {
    sessionStorage.setItem('rtr-notif-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, width: 'calc(100% - 40px)', maxWidth: 440,
      background: '#111', border: '1px solid #2a2a2a',
      borderRadius: 14, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: '#1a1500', border: '1px solid #2a2000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 18,
      }}>
        🔔
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
          Run reminders
        </p>
        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>
          Get notified about Thursday runs and group updates.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={dismiss}
          style={{
            padding: '7px 12px', borderRadius: 7, border: '1px solid #222',
            background: 'transparent', color: '#555', fontSize: 12,
            fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
          }}
        >
          Not now
        </button>
        <button
          onClick={subscribe}
          disabled={loading}
          style={{
            padding: '7px 14px', borderRadius: 7, border: 'none',
            background: '#f5a623', color: '#0a0a0a', fontSize: 12,
            fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer',
            fontWeight: 700, opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '…' : 'Enable'}
        </button>
      </div>
    </div>
  )
}
