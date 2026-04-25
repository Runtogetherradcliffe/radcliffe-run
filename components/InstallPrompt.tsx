'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY    = 'rtr-install-dismissed'
const VISIT_KEY      = 'rtr-visit-count'
const VISITS_NEEDED  = 2   // show after this many page loads

type Platform = 'android' | 'ios' | null

export default function InstallPrompt() {
  const [platform, setPlatform]       = useState<Platform>(null)
  const [deferredPrompt, setPrompt]   = useState<any>(null)
  const [visible, setVisible]         = useState(false)
  const [installing, setInstalling]   = useState(false)

  useEffect(() => {
    // Already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Already permanently dismissed
    if (localStorage.getItem(STORAGE_KEY)) return

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
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream
    const isAndroidChrome = /Android/.test(ua) && /Chrome/.test(ua) && !/Edge|OPR/.test(ua)

    if (isIOS) {
      // iOS Safari — only show if not already in standalone
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)
      if (isSafari) {
        setPlatform('ios')
        setVisible(true)
      }
      return
    }

    if (isAndroidChrome) {
      // Android Chrome — wait for beforeinstallprompt
      setPlatform('android')
      // It may already have fired; listen for it
      const handler = (e: Event) => {
        e.preventDefault()
        setPrompt(e)
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
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
      background: '#111', border: '1px solid #2a2a2a',
      borderRadius: 14, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {platform === 'ios' ? (
        /* ── iOS: explain the Share → Add to Home Screen flow ── */
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Add to Home Screen</p>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>Get quick access to radcliffe.run like an app.</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              style={{ background: 'none', border: 'none', color: '#444', fontSize: 18, cursor: 'pointer', flexShrink: 0, lineHeight: 1, padding: 0 }}
              aria-label="Dismiss"
            >×</button>
          </div>

          {/* Step-by-step instruction */}
          <div style={{ background: '#0d0d0d', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Step n={1}>
              Tap the{' '}
              <ShareIcon />{' '}
              <span style={{ color: '#ccc' }}>Share</span> button at the bottom of Safari
            </Step>
            <Step n={2}>
              Scroll down and tap{' '}
              <span style={{ color: '#fff', fontWeight: 600 }}>Add to Home Screen</span>
            </Step>
            <Step n={3}>
              Tap <span style={{ color: '#fff', fontWeight: 600 }}>Add</span> to confirm
            </Step>
          </div>
        </div>
      ) : (
        /* ── Android: native install button ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Add to Home Screen</p>
            <p style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>Install radcliffe.run for quick access.</p>
          </div>
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
        width: 20, height: 20, borderRadius: '50%', background: '#1e1e1e',
        border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f5a623',
        flexShrink: 0, marginTop: 1,
      }}>{n}</span>
      <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, margin: 0 }}>{children}</p>
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
