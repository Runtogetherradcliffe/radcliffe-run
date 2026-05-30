import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
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
  const darkFile = formData.get('dark') as File | null
  const lightFile = formData.get('light') as File | null

  if (!darkFile && !lightFile) {
    return NextResponse.json({ error: 'No image files provided' }, { status: 400 })
  }

  const results: { file: string; ok: boolean; error?: string }[] = []

  if (darkFile) {
    const buffer = Buffer.from(await darkFile.arrayBuffer())
    const repoPath = `public/route-maps/${slug}.webp`

    if (process.env.NODE_ENV !== 'production') {
      try {
        await writeFile(path.join(process.cwd(), 'public', 'route-maps', `${slug}.webp`), buffer)
      } catch { /* non-fatal */ }
    }

    const result = await pushFileToGitHub(
      repoPath,
      buffer,
      `admin: replace dark map image for ${slug}`,
      'staging'
    )
    results.push({ file: 'dark', ...result })
  }

  if (lightFile) {
    const buffer = Buffer.from(await lightFile.arrayBuffer())
    const repoPath = `public/route-maps/light/${slug}.webp`

    if (process.env.NODE_ENV !== 'production') {
      try {
        await mkdir(path.join(process.cwd(), 'public', 'route-maps', 'light'), { recursive: true })
        await writeFile(path.join(process.cwd(), 'public', 'route-maps', 'light', `${slug}.webp`), buffer)
      } catch { /* non-fatal */ }
    }

    const result = await pushFileToGitHub(
      repoPath,
      buffer,
      `admin: replace light map image for ${slug}`,
      'staging'
    )
    results.push({ file: 'light', ...result })
  }

  const allOk = results.every(r => r.ok)
  const errors = results.filter(r => !r.ok).map(r => `${r.file}: ${r.error}`).join('; ')

  if (!allOk) {
    return NextResponse.json({ error: errors || 'GitHub push failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug, uploaded: results.map(r => r.file) })
}
