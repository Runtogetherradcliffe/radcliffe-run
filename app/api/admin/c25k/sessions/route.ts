import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin'
import { buildC25kSessions, isTuesday } from '@/lib/c25kSessions'
import { effectiveProgramme, type SessionOrder, type WeekOverrides } from '@/lib/c25kProgramme'

/**
 * POST /api/admin/c25k/sessions - create or update the C25K cohort's session
 * rows (lib/c25kSessions.ts). Admin only. Body `{ start_date }` is the date on
 * the Settings form: it is SAVED as `site_settings.c25k_start_date` and the
 * sessions are built from it, so the button needs no separate Save (Paul,
 * 18 Nov 2026). With no body it uses the saved date.
 * `?dryRun=1` returns the sessions it would write without touching anything.
 * `?updateOnly=1` refreshes sessions that already exist and creates none: the
 * Settings save calls it so edited week 6/7 runs reach existing sessions,
 * without ever creating rows before the app is ready for them.
 *
 * Idempotent: rows are matched on their stable key in `google_event_id`, so a
 * second press updates dates, titles and meeting points in place. It never
 * touches `cancelled` on an existing row (an admin may cancel one session) and
 * never deletes anything.
 */
export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const dryRun = params.get('dryRun') === '1'
  const updateOnly = params.get('updateOnly') === '1'
  const db = supabaseAdmin()

  const { data: settings, error: settingsError } = await db
    .from('site_settings')
    .select('c25k_start_date, c25k_session_order, c25k_week_overrides')
    .single()
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 })

  const body = await req.json().catch(() => ({})) as { start_date?: unknown }
  const fromForm = typeof body.start_date === 'string' && body.start_date.trim() ? body.start_date.trim() : null
  const start = fromForm ?? ((settings?.c25k_start_date as string | null) ?? null)
  if (!start) return NextResponse.json({ error: 'Set a C25K start date first.' }, { status: 400 })
  if (!isTuesday(start)) return NextResponse.json({ error: `The start date (${start}) is not a Tuesday. C25K starts on a Tuesday.` }, { status: 400 })

  const programme = effectiveProgramme(
    (settings?.c25k_session_order as SessionOrder | null) ?? null,
    (settings?.c25k_week_overrides as WeekOverrides | null) ?? null,
  )
  const sessions = buildC25kSessions(start, programme)
  if (dryRun) return NextResponse.json({ dryRun: true, sessions })

  // The form's date becomes the saved one, so the /c25k page, the programme and
  // the sessions can never disagree.
  if (!updateOnly && fromForm && fromForm !== settings?.c25k_start_date) {
    const { error: saveError } = await db.from('site_settings').update({ c25k_start_date: fromForm }).eq('id', 1)
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })
  }

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
      description: s.description,
      run_type: 'c25k',
    }
    const id = idByKey.get(s.key)
    if (id) {
      const { error } = await db.from('runs').update(fields).eq('id', id)
      if (error) errors.push(`UPDATE ${s.key}: ${error.message}`)
      else updated++
    } else if (!updateOnly) {
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
