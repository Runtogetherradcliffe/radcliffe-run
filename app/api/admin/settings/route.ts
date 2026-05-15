import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  // Debug: read current settings via service role
  const { data, error } = await supabaseAdmin()
    .from('site_settings')
    .select('*')
    .single()
  return NextResponse.json({ data, error })
}

export async function PATCH(req: Request) {
  // Auth check using session client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['hero_image_url', 'sync_thursday_sheet', 'sync_social_sheet', 'show_social_calendar', 'email_default_subject', 'email_default_opening', 'email_default_closing', 'c25k_enabled', 'c25k_registration_open', 'c25k_start_date', 'c25k_cohort_label', 'c25k_max_registrations', 'c25k_session_order']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // Upsert — creates row if it doesn't exist, updates if it does
  const { data, error } = await supabaseAdmin()
    .from('site_settings')
    .upsert({ id: 1, ...update }, { onConflict: 'id' })
    .select()

  console.log('[settings PATCH] update payload:', update)
  console.log('[settings PATCH] result:', { data, error })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, saved: data })
}
