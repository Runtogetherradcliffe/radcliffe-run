import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  // Auth check — must be signed in as admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path     = `hero.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  // Upload via service role — bypasses storage RLS
  const admin = supabaseAdmin()
  const { error } = await admin.storage
    .from('site-images')
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = admin.storage.from('site-images').getPublicUrl(path)
  // Cache-bust so the new image shows immediately
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`

  return NextResponse.json({ url: publicUrl })
}
