import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { date, title, description, route_slug, distance_km, terrain, meeting_point, leader_name } = body

  if (!date || !title || !meeting_point) {
    return NextResponse.json({ error: 'date, title and meeting_point are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('runs')
    .insert({ date, title, description, route_slug, distance_km, terrain, meeting_point, leader_name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
