/**
 * GET /api/cron/send-push
 * The Thursday-afternoon run announcement to native devices. Called by
 * cron-job.org (~4pm Thursdays) at https://www.radcliffe.run/... (the www
 * host - external callers drop the Authorization header across the apex
 * redirect). NOT a Vercel cron: Hobby is at its one-per-day budget.
 * Protected by CRON_SECRET; idempotent via the push_send_log claim-lock
 * (UNIQUE(kind, ref_date)) so a retry cannot double-send.
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadPushTokens, sendExpoPush } from '@/lib/expoPush'
import { composeAnnouncement } from '@/lib/pushAnnouncement'

export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET

function todayInLondon(): string {
  // en-CA gives YYYY-MM-DD directly
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
}

export async function GET(req: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const db = supabaseAdmin()
  const today = todayInLondon()

  // Tonight's club runs (C25K sessions get their own reminders in v1.1).
  const { data: runs, error } = await db
    .from('runs')
    .select('id, title, distance_km, terrain, meeting_point, on_tour, cancelled, run_type, has_jeffing')
    .eq('date', today)
    .in('run_type', ['regular', 'social'])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const active = (runs ?? []).filter(r => !r.cancelled)
  if (active.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no runs today' })
  }

  // Claim-lock: the UNIQUE(kind, ref_date) insert is the idempotency gate.
  const { error: claimError } = await db
    .from('push_send_log')
    .insert({ kind: 'weekly', ref_date: today })
  if (claimError) {
    // 23505 unique violation = already sent today - the normal second-trigger path
    return NextResponse.json({ ok: true, skipped: 'already sent' })
  }

  // Compose: distances merged, on-tour named ("where we're headed") -
  // pure logic in lib/pushAnnouncement.ts, unit-tested.
  const message = composeAnnouncement(active)
  if (!message) {
    return NextResponse.json({ ok: true, skipped: 'no runs today' })
  }
  const { title, body } = message

  const tokens = await loadPushTokens('weekly')
  const result = await sendExpoPush(tokens, { title, body, url: '/' })

  await db
    .from('push_send_log')
    .update({ recipient_count: result.sent })
    .eq('kind', 'weekly')
    .eq('ref_date', today)

  return NextResponse.json({ ...result, title, body })
}
