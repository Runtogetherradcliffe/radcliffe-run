'use client'
import { useState } from 'react'

export default function PhotoGallery({ urls }: { urls: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const close = () => setLightbox(null)
  const prev  = () => setLightbox(i => i !== null ? (i - 1 + urls.length) % urls.length : null)
  const next  = () => setLightbox(i => i !== null ? (i + 1) % urls.length : null)

  if (urls.length === 0) return null

  const isSingle = urls.length === 1

  return (
    <>
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isSingle ? '1fr' : urls.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
        gap: 6,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {urls.map((url, i) => (
          <button
            key={url}
            onClick={() => setLightbox(i)}
            style={{
              display: 'block', border: 'none', padding: 0, cursor: 'pointer',
              aspectRatio: isSingle ? '16/9' : '1',
              overflow: 'hidden', background: '#111',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[lightbox]}
              alt={`Photo ${lightbox + 1}`}
              style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8, display: 'block' }}
            />
            {/* Close */}
            <button
              onClick={close}
              style={{
                position: 'absolute', top: -14, right: -14,
                background: '#111', border: '1px solid #333', borderRadius: '50%',
                width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: '#aaa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
            {/* Counter */}
            <p style={{ textAlign: 'center', fontSize: 12, color: '#555', marginTop: 10 }}>
              {lightbox + 1} / {urls.length}
            </p>
          </div>

          {/* Prev / next */}
          {urls.length > 1 && (
            <>
              <button
                onClick={prev}
                style={{
                  position: 'fixed', left: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)', border: '1px solid #333', borderRadius: 8,
                  width: 44, height: 44, fontSize: 20, cursor: 'pointer', color: '#ccc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >‹</button>
              <button
                onClick={next}
                style={{
                  position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)', border: '1px solid #333', borderRadius: 8,
                  width: 44, height: 44, fontSize: 20, cursor: 'pointer', color: '#ccc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >›</button>
            </>
          )}
        </div>
      )}
    </>
  )
}
