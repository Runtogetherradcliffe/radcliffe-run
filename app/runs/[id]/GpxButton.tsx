'use client'

/**
 * GPX download button — PWA-safe.
 *
 * In Safari (browser):      blob anchor click triggers download/Quick Look overlay
 * In iOS PWA (standalone):  shows an in-app bottom sheet so Quick Look never opens
 *                           in a new windowless webview with no back button.
 *
 * If the blob click fails silently (detection edge-case), falls back to
 * same-window navigation so Quick Look still opens as an overlay (Done → back).
 */

import { useState } from 'react'

interface IOSNavigator extends Navigator { standalone?: boolean }

function isPwaMode(): boolean {
  return (
    (navigator as IOSNavigator).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export default function GpxButton({ file, accentColor = '#f5a623' }: { file: string; accentColor?: string }) {
  const [showPanel, setShowPanel] = useState(false)

  async function handleClick() {
    const absoluteUrl = `${window.location.origin}/gpx/${file}`

    if (isPwaMode()) {
      setShowPanel(true)
      return
    }

    // Browser mode: blob download (works in Safari on iOS/desktop)
    try {
      const res = await fetch(`/gpx/${file}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Blob failed — fall back to same-window navigation so Quick Look opens
      // as an overlay (Done returns to this page) rather than navigating away permanently
      window.location.href = absoluteUrl
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        style={{
          fontSize: 12, fontWeight: 600, color: '#0a0a0a',
          background: accentColor, padding: '7px 14px',
          borderRadius: 6, border: 'none', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
        }}
      >
        GPX
      </button>

      {/* In-app panel — shown in PWA mode instead of navigating away */}
      {showPanel && (
        <div
          onClick={() => setShowPanel(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: 'var(--card)', borderTop: '1px solid var(--border)',
              borderRadius: '16px 16px 0 0', padding: '20px 20px 40px',
            }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border-2)', borderRadius: 2, margin: '0 auto 20px' }} />
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--white)', marginBottom: 6 }}>Download GPX route</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Tap <strong style={{ color: 'var(--dim)' }}>Save to Files</strong> in the sheet below, then open the file from the Files app to import into WorkOutDoors or any GPS app.
            </p>

            {/* Share the file — iOS shows "Save to Files" which lets users open with WorkOutDoors.
                GPS apps are document handlers, not share extensions, so they won't appear
                in this sheet directly — the Save to Files → open in app workflow is the
                best achievable from a PWA on iOS. */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/gpx/${file}`)
                    const blob = await res.blob()
                    const gpxFile = new File([blob], file, { type: 'application/gpx+xml' })
                    await navigator.share({ files: [gpxFile] })
                  } catch { /* cancelled or unsupported */ }
                }}
                style={{
                  width: '100%', background: accentColor, color: '#0a0a0a', border: 'none',
                  borderRadius: 10, fontSize: 'var(--text-base)', fontWeight: 700, padding: '13px',
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
                }}
              >
                Save GPX file…
              </button>
            )}

            {/* Copy link */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/gpx/${file}`)
                setShowPanel(false)
              }}
              style={{
                width: '100%', background: 'var(--card-hi)', color: 'var(--dim)', border: '1px solid var(--border)',
                borderRadius: 10, fontSize: 'var(--text-base)', fontWeight: 500, padding: '13px',
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
              }}
            >
              Copy link
            </button>

            <button
              onClick={() => setShowPanel(false)}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: 'var(--faint)', fontSize: 'var(--text-base)', padding: '10px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
