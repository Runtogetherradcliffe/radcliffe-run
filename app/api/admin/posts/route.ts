import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type   = searchParams.get('type')   // 'roundup' | 'news' | null
  const status = searchParams.get('status') // 'draft' | 'published' | 'archived' | null

  let query = supabaseAdmin()
    .from('posts')
    .select('id, type, status, title, summary, slug, published_at, created_at, photo_urls')
    .order('created_at', { ascending: false })

  if (type)   query = query.eq('type', type)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { type, title, summary, content, photo_urls, status, published_at } = body

  if (!type || !title) {
    return NextResponse.json({ error: 'type and title are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('posts')
    .insert({
      type,
      title,
      summary: summary ?? null,
      content: content ?? '',
      photo_urls: photo_urls ?? [],
      status: status ?? 'draft',
      published_at: published_at ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
