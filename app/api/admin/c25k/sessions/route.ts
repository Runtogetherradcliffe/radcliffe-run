import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin'
import { buildC25kSessions, isTuesday } from '@/lib/c25kSessions'

/**
 * POST /api/admin/c25k/sessions - create or update the C25K cohort's session
 * rows from the SAVED start date (lib/c25kSessions.ts). Admin only.
 * `?dryRun=1` returns the sessions it would write without touching the table.
 *
 * Idempotent: rows are matched on their stable key in `google_event_id`, so a
 * second press updates dates, titles and meeting points in place. It never
 * touches `cancelled` on an existing row (an admin may cancel one session) and
 * never deletes anything.
 */
export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
  const db = supabaseAdmin()

  const { data: settings, error: settingsError } = await db
    .from('site_settings')
    .select('c25k_start_date')
    .single()
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 })

  const start = (settings?.c25k_start_date as string | null) ?? null
  if (!start) return NextResponse.json({ error: 'Set and save the C25K start date first.' }, { status: 400 })
  if (!isTuesday(start)) return NextResponse.json({ error: `The saved start date (${start}) is not a Tuesday.` }, { status: 400 })

  const sessions = buildC25kSessions(start)
  if (dryRun) return NextResponse.json({ dryRun: true, sessions })

  const cohortPrefix = sessions[0].key.split(':')[0]
  const { data: existing, error: existingError } = await db
    .from('runs')
    .select('id, google_event_id')
    .like('google_event_id', `${cohortPrefix}:%`)
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  const idByKey = new Map((existing ?? []).map(r => [r.google_event_id as string, r.id as string]))

  let inserted = 0, updated = 0
  const errors: string[] = []
  for (const s of sessions) {
    const fields = {
      date: s.date,
      title: s.title,
      meeting_point: s.meeting_point,
      start_time: s.start_time,
      run_type: 'c25k',
    }
    const id = idByKey.get(s.key)
    if (id) {
      const { error } = await db.from('runs').update(fields).eq('id', id)
      if (error) errors.push(`UPDATE ${s.key}: ${error.message}`)
      else updated++
    } else {
      const { error } = await db.from('runs').insert({
        ...fields,
        google_event_id: s.key,
        end_time: null,
        cancelled: false,
        on_tour: false,
        has_jeffing: false,
      })
      if (error) errors.push(`INSERT ${s.key}: ${error.message}`)
      else inserted++
    }
  }

  return NextResponse.json(
    { start, inserted, updated, total: sessions.length, errors },
    { status: errors.length ? 207 : 200 },
  )
}
