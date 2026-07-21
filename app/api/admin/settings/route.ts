import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  // Debug: read current settings via service role - admin only
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('site_settings')
    .select('*')
    .single()
  return NextResponse.json({ data, error })
}

export async function PATCH(req: Request) {
  // Auth check - admin only
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['hero_image_url', 'sync_thursday_sheet', 'sync_social_sheet', 'show_social_calendar', 'email_default_subject', 'email_default_opening', 'email_default_closing', 'c25k_enabled', 'c25k_registration_open', 'c25k_start_date', 'c25k_cohort_label', 'c25k_max_registrations', 'c25k_session_order', 'weekly_note']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // The weekly note self-expires 7 days after its text last CHANGED (it is
  // served by /api/home only while fresh). Stamp on change, not on every
  // save - the settings form sends all fields, so a C25K toggle edit must
  // not re-freshen a stale note.
  if ('weekly_note' in update) {
    const { data: current } = await supabaseAdmin()
      .from('site_settings')
      .select('weekly_note')
      .eq('id', 1)
      .maybeSingle()
    if ((current?.weekly_note ?? null) !== (update.weekly_note ?? null)) {
      update.weekly_note_updated_at = new Date().toISOString()
    }
  }

  // Upsert - creates row if it doesn't exist, updates if it does
  const { data, error } = await supabaseAdmin()
    .from('site_settings')
    .upsert({ id: 1, ...update }, { onConflict: 'id' })
    .select()

  console.log('[settings PATCH] update payload:', update)
  console.log('[settings PATCH] result:', { data, error })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, saved: data })
}
