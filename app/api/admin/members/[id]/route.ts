import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify the user is authenticated as admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {}

  if ('status' in body) {
    if (body.status !== 'active' && body.status !== 'inactive') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  if ('is_run_leader' in body) {
    if (typeof body.is_run_leader !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_run_leader' }, { status: 400 })
    }
    update.is_run_leader = body.is_run_leader
  }

  if ('uka_number' in body) {
    update.uka_number = body.uka_number || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from('members')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
