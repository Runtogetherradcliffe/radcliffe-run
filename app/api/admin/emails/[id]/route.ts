import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

const EMAIL_ALLOWED_FIELDS = [
  'thursday_date', 'scheduled_for', 'status', 'subject',
  'show_opening', 'opening_text', 'show_route_block', 'custom_text',
  'show_closing', 'closing_text', 'recipient_filter',
]

// GET /api/admin/emails/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabaseAdmin()
    .from('scheduled_emails')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/admin/emails/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Prevent editing sent emails
  const { data: existing } = await supabaseAdmin()
    .from('scheduled_emails')
    .select('status')
    .eq('id', id)
    .single()

  if (existing?.status === 'sent') {
    return NextResponse.json({ error: 'Cannot edit a sent email' }, { status: 400 })
  }

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const key of EMAIL_ALLOWED_FIELDS) {
    if (key in body) patch[key] = body[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('scheduled_emails')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/emails/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabaseAdmin()
    .from('scheduled_emails')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
