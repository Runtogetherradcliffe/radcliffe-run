import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/admin/emails — list all emails
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('scheduled_emails')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/emails — create a new draft
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Pull defaults from site_settings to pre-fill opening/closing if not provided
  const { data: settings } = await supabaseAdmin()
    .from('site_settings')
    .select('email_default_subject, email_default_opening, email_default_closing')
    .single()

  const payload = {
    thursday_date:    body.thursday_date    ?? null,
    scheduled_for:    body.scheduled_for    ?? null,
    status:           body.status           ?? 'draft',
    subject:          body.subject          ?? settings?.email_default_subject ?? '',
    show_opening:     body.show_opening     ?? true,
    opening_text:     body.opening_text     ?? settings?.email_default_opening ?? '',
    show_route_block: body.show_route_block ?? true,
    custom_text:      body.custom_text      ?? null,
    show_closing:     body.show_closing     ?? true,
    closing_text:     body.closing_text     ?? settings?.email_default_closing ?? '',
    recipient_filter: body.recipient_filter ?? 'all',
  }

  const { data, error } = await supabaseAdmin()
    .from('scheduled_emails')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
