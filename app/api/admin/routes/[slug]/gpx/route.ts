import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { requireAdmin } from '@/lib/admin'
import { pushFileToGitHub } from '@/lib/githubPush'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { slug } = await params

  if (!slug || !/^[\w-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get('gpx') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!file.name.endsWith('.gpx') && file.type !== 'application/gpx+xml') {
    return NextResponse.json({ error: 'File must be a .gpx file' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const repoPath = `public/gpx/${slug}.gpx`

  // In dev: write directly to local filesystem for immediate use
  if (process.env.NODE_ENV !== 'production') {
    try {
      await writeFile(path.join(process.cwd(), 'public', 'gpx', `${slug}.gpx`), buffer)
    } catch {
      // Non-fatal - GitHub push below is the canonical path
    }
  }

  // Push to GitHub staging branch
  const result = await pushFileToGitHub(
    repoPath,
    buffer,
    `admin: replace GPX for ${slug}`,
    'staging'
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'GitHub push failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug, repoPath })
}
