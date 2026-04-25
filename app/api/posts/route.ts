import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type  = searchParams.get('type')  // 'roundup' | 'news' | null
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  let query = supabaseAdmin()
    .from('posts')
    .select('id, type, title, summary, slug, published_at, photo_urls')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
