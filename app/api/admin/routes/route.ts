import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('route_descriptions')
    .select('*')
    .order('slug')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { slug, description } = body

  if (!slug || !description?.trim()) {
    return NextResponse.json({ error: 'slug and description are required' }, { status: 400 })
  }

  const upsertRow: Record<string, string> = { slug, description: description.trim() }

  const { data, error } = await supabaseAdmin()
    .from('route_descriptions')
    .upsert(upsertRow, { onConflict: 'slug' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { slug } = await request.json()
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  const { error } = await supabaseAdmin()
    .from('route_descriptions')
    .delete()
    .eq('slug', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
