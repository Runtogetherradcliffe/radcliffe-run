'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Post = {
  id?: string
  type: 'roundup' | 'news'
  status: 'draft' | 'published' | 'archived'
  title: string
  summary: string
  content: string
  photo_urls: string[]
  published_at: string | null
}

const FIELD: React.CSSProperties = {
  width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e',
  borderRadius: 8, color: '#ddd', fontSize: 14, padding: '10px 14px',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#555', marginBottom: 6, display: 'block',
}

export default function PostEditor({ initial, isNew }: { initial: Post; isNew: boolean }) {
  const router = useRouter()

  const [type, setType]               = useState<Post['type']>(initial.type)
  const [status, setStatus]           = useState<Post['status']>(initial.status)
  const [title, setTitle]             = useState(initial.title)
  const [summary, setSummary]         = useState(initial.summary)
  const [content, setContent]         = useState(initial.content)
  const [publishedAt, setPublishedAt] = useState(initial.published_at ?? '')
  const [photoUrls, setPhotoUrls]     = useState<string[]>(initial.photo_urls)

  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // ── save / publish ────────────────────────────────────────────────
  async function save(overrideStatus?: Post['status']) {
    setSaving(true)
    setError(null)
    const body = {
      type,
      status: overrideStatus ?? status,
      title,
      summary: summary || null,
      content,
      photo_urls: photoUrls,
      published_at: publishedAt || null,
    }
    try {
      const url = isNew ? '/api/admin/posts' : `/api/admin/posts/${initial.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Save failed')
      }
      const saved = await res.json()
      if (isNew) {
        router.push(`/admin/posts/${saved.id}`)
      } else {
        if (overrideStatus) setStatus(overrideStatus)
        router.refresh()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  // ── photo upload ──────────────────────────────────────────────────
  async function uploadPhotos(files: FileList) {
    setUploading(true)
    setError(null)
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'site-images')
      fd.append('folder', 'posts')
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Upload failed')
        const { url } = await res.json()
        newUrls.push(url)
      } catch {
        setError('One or more photos failed to upload')
      }
    }
    setPhotoUrls(prev => [...prev, ...newUrls])
    setUploading(false)
  }

  function removePhoto(url: string) {
    setPhotoUrls(prev => prev.filter(u => u !== url))
  }

  // ── delete ────────────────────────────────────────────────────────
  async function deletePost() {
    if (!initial.id) return
    setSaving(true)
    try {
      await fetch(`/api/admin/posts/${initial.id}`, { method: 'DELETE' })
      router.push('/admin/posts')
    } catch {
      setError('Delete failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #5a1a1a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#e05252' }}>
          {error}
        </div>
      )}

      {/* Type + Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={LABEL}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as Post['type'])} style={{ ...FIELD, height: 42 }}>
            <option value="roundup">Roundup</option>
            <option value="news">News</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Published date</label>
          <input
            type="date"
            value={publishedAt}
            onChange={e => setPublishedAt(e.target.value)}
            style={{ ...FIELD, height: 42 }}
          />
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <label style={LABEL}>Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Post title"
          style={{ ...FIELD, fontSize: 16, fontWeight: 600 }}
        />
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 20 }}>
        <label style={LABEL}>Summary <span style={{ color: '#333', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(shown on cards)</span></label>
        <input
          type="text"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="One-line summary for the homepage card"
          style={FIELD}
        />
      </div>

      {/* Content */}
      <div style={{ marginBottom: 24 }}>
        <label style={LABEL}>Content</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={16}
          placeholder="Write the full post here…"
          style={{ ...FIELD, resize: 'vertical', lineHeight: 1.7 }}
        />
        <p style={{ fontSize: 11, color: '#444', marginTop: 6 }}>Plain text. Paragraph breaks become paragraphs on the public page.</p>
      </div>

      {/* Photos */}
      <div style={{ marginBottom: 28 }}>
        <label style={LABEL}>Photos</label>

        {photoUrls.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {photoUrls.map(url => (
              <div key={url} style={{ position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e1e1e', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => removePhoto(url)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4,
                    color: '#fff', fontSize: 12, width: 22, height: 22, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && uploadPhotos(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            fontSize: 13, fontWeight: 600, color: '#888',
            background: '#111', border: '1px solid #1e1e1e',
            padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
          }}
        >
          {uploading ? 'Uploading…' : '+ Add photos'}
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 20, borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={() => save('draft')}
          disabled={saving || !title}
          style={{
            fontSize: 13, fontWeight: 600, color: '#888',
            background: '#111', border: '1px solid #1e1e1e',
            padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>

        <button
          onClick={() => save('published')}
          disabled={saving || !title}
          style={{
            fontSize: 13, fontWeight: 700, color: '#0a0a0a',
            background: status === 'published' ? '#7cb87c' : '#f5a623',
            border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
          }}
        >
          {saving ? 'Saving…' : status === 'published' ? 'Update published post' : 'Publish'}
        </button>

        {!isNew && status === 'published' && (
          <a
            href={`/news/${initial.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13, fontWeight: 600, color: '#6b9fd4',
              background: '#0d1221', border: '1px solid #1a2a44',
              padding: '10px 18px', borderRadius: 8, textDecoration: 'none',
            }}
          >
            View live →
          </a>
        )}

        {!isNew && (
          <div style={{ marginLeft: 'auto' }}>
            {deleteConfirm ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#888' }}>Sure?</span>
                <button
                  onClick={deletePost}
                  style={{ fontSize: 13, fontWeight: 600, color: '#e05252', background: 'none', border: '1px solid #5a1a1a', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  style={{ fontSize: 13, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                style={{ fontSize: 13, color: '#555', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Delete post
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
