import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  // Auth check — must be signed in as admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file   = formData.get('file') as File | null
  const folder = (formData.get('folder') as string | null) ?? ''
  const bucket = (formData.get('bucket') as string | null) ?? 'site-images'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  // For hero uploads (no folder), keep legacy behaviour. For other folders, use timestamp filename.
  const filename = folder ? `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}` : `hero.${ext}`
  const path     = folder ? `${folder}/${filename}` : filename
  const upsert   = !folder // only upsert for hero
  const buffer   = Buffer.from(await file.arrayBuffer())

  // Upload via service role — bypasses storage RLS
  const admin = supabaseAdmin()
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, buffer, { upsert, contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = admin.storage.from(bucket).getPublicUrl(path)
  // Cache-bust hero image so the new image shows immediately
  const publicUrl = folder ? data.publicUrl : `${data.publicUrl}?t=${Date.now()}`

  return NextResponse.json({ url: publicUrl })
}
