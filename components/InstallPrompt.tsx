'use client'

import { useEffect, useState } from 'react'
import { IOS_APP_URL } from '@/lib/iosApp'

const STORAGE_KEY    = 'rtr-install-dismissed'
// Separate key for the iPhone app prompt (Nov 2026): people who dismissed the
// old "Add to Home Screen" prompt should still hear about the native app once.
const APP_STORAGE_KEY = 'rtr-ios-app-dismissed'
const VISIT_KEY      = 'rtr-visit-count'
const VISITS_NEEDED  = 2   // show after this many page loads

// 'iphone' = the native app on the App Store; 'ios' = Add to Home Screen, kept
// for iPad, where the app is not offered (it is iPhone-only).
type Platform = 'android' | 'ios' | 'iphone' | null

/** Chrome's install prompt event - not yet in the standard TS DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [platform, setPlatform]       = useState<Platform>(null)
  const [deferredPrompt, setPrompt]   = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible]         = useState(false)
  const [installing, setInstalling]   = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIPhone = /iPhone|iPod/.test(ua)
    const standalone = window.matchMedia('(display-mode: standalone)').matches

    // iPhone: offer the native app - in any browser, and also inside the saved
    // home-screen site, whose users are the most regular visitors.
    if (isIPhone) {
      if (localStorage.getItem(APP_STORAGE_KEY)) return
    } else {
      // Already installed (running in standalone mode)
      if (standalone) return
      // Already permanently dismissed
      if (localStorage.getItem(STORAGE_KEY)) return
    }

    // Increment visit counter once per session (not per page navigation)
    const alreadyCountedThisSession = sessionStorage.getItem(VISIT_KEY)
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10)
    const newVisits = alreadyCountedThisSession ? visits : visits + 1
    if (!alreadyCountedThisSession) {
      localStorage.setItem(VISIT_KEY, String(newVisits))
      sessionStorage.setItem(VISIT_KEY, '1')
    }
    if (newVisits < VISITS_NEEDED) return

    // Detect platform
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    const isAndroidChrome = /Android/.test(ua) && /Chrome/.test(ua) && !/Edge|OPR/.test(ua)

    /* eslint-disable react-hooks/set-state-in-effect -- one-time platform detection on mount; browser APIs are unavailable during SSR render */
    if (isIPhone) {
      setPlatform('iphone')
      setVisible(true)
      return
    }

    if (isIOS) {
      // iOS Safari - only show if not already in standalone
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)
      if (isSafari) {
        setPlatform('ios')
        setVisible(true)
      }
      return
    }

    if (isAndroidChrome) {
      // Android Chrome - wait for beforeinstallprompt
      setPlatform('android')
      /* eslint-enable react-hooks/set-state-in-effect */
      // It may already have fired; listen for it
      const handler = (e: Event) => {
        e.preventDefault()
        setPrompt(e as BeforeInstallPromptEvent)
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(platform === 'iphone' ? APP_STORAGE_KEY : STORAGE_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setPrompt(null)
    setVisible(false)
    setInstalling(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 490, width: 'calc(100% - 40px)', maxWidth: 440,
      background: 'var(--card)', border: '1px solid var(--border-2)',
      borderRadius: 14, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {platform === 'iphone' ? (
        /* ── iPhone: the native app on the App Store ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Get the iPhone app</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', lineHeight: 1.4 }}>This week&apos;s runs, route maps and run tracking. Free on the App Store.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={dismiss}
              style={{
                padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--faint)', fontSize: 'var(--text-xs)',
                fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
              }}
            >
              Not now
            </button>
            <a
              href={IOS_APP_URL}
              onClick={() => { localStorage.setItem(APP_STORAGE_KEY, '1'); setVisible(false) }}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none',
                background: 'var(--orange)', color: 'var(--bg)', fontSize: 'var(--text-xs)',
                fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none',
              }}
            >
              Get the app
            </a>
          </div>
        </div>
      ) : platform === 'ios' ? (
        /* ── iOS: explain the Share → Add to Home Screen flow ── */
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Add to Home Screen</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>Get quick access to radcliffe.run like an app.</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', flexShrink: 0, lineHeight: 1, padding: 0 }}
              aria-label="Dismiss"
            >×</button>
          </div>

          {/* Step-by-step instruction */}
          <div style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Step n={1}>
              Tap the{' '}
              <ShareIcon />{' '}
              <span style={{ color: 'var(--dim)' }}>Share</span> button at the bottom of Safari
            </Step>
            <Step n={2}>
              Scroll down and tap{' '}
              <span style={{ color: 'var(--white)', fontWeight: 600 }}>Add to Home Screen</span>
            </Step>
            <Step n={3}>
              Tap <span style={{ color: 'var(--white)', fontWeight: 600 }}>Add</span> to confirm
            </Step>
          </div>
        </div>
      ) : (
        /* ── Android: native install button ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Add to Home Screen</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>Install radcliffe.run for quick access.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={dismiss}
              style={{
                padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--faint)', fontSize: 12,
                fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
              }}
            >
              Not now
            </button>
            <button
              onClick={install}
              disabled={installing}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none',
                background: '#f5a623', color: '#0a0a0a', fontSize: 12,
                fontFamily: 'inherit', cursor: installing ? 'default' : 'pointer',
                fontWeight: 700, opacity: installing ? 0.7 : 1, whiteSpace: 'nowrap',
              }}
            >
              {installing ? '…' : 'Install'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: 'var(--card-hi)',
        border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#f5a623',
        flexShrink: 0, marginTop: 1,
      }}>{n}</span>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>{children}</p>
    </div>
  )
}

/** Safari share icon, inline SVG */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14" height="14"
      style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
      fill="none"
      stroke="#6b9fd4"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
