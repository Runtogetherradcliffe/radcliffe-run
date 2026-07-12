/**
 * GET /api/cron/awards
 * Weekly award-crossing computation (docs/ATTENDANCE_RECOGNITION_BRIEF.md,
 * 12 Jul 2026 build). Called by cron-job.org (Thursday ~22:30 UK, after
 * check-in traffic) at https://www.radcliffe.run/... (the www host - see
 * AGENTS.md, external callers drop Authorization across the apex redirect).
 * NOT a Vercel cron - Hobby is at its one-per-day budget with send-emails
 * and gdpr-cleanup, same reasoning as /api/cron/send-push.
 * Protected by CRON_SECRET; idempotent via the awards_cron_log claim-lock
 * (UNIQUE(ref_date)) so a same-day retry cannot double-run the job.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runAwardsJob } from '@/lib/awardsJob'

export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET

function todayInLondon(): string {
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

  // Claim-lock: the UNIQUE(ref_date) insert is the idempotency gate.
  const { error: claimError } = await db.from('awards_cron_log').insert({ ref_date: today })
  if (claimError) {
    return NextResponse.json({ ok: true, skipped: 'already run today' })
  }

  try {
    const result = await runAwardsJob()
    await db
      .from('awards_cron_log')
      .update({ finished_at: new Date().toISOString(), awards_written: result.awardsWritten })
      .eq('ref_date', today)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    )
  }
}
