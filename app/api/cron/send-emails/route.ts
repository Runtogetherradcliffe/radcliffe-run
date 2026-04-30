/**
 * GET /api/cron/send-emails
 * Called by Vercel Cron (daily at 8am UTC). Finds any scheduled emails
 * whose scheduled_for time has passed and sends them directly —
 * no internal HTTP call, avoiding double-timeout issues on Hobby plan.
 * Protected by CRON_SECRET (Vercel injects this as Authorization: Bearer <secret>).
 */
import { NextRequest, NextResponse } from 'next/server'
import { sendScheduledEmail } from '@/lib/sendScheduledEmail'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (set CRON_SECRET in Vercel env vars)
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const db = supabaseAdmin()

  // Find emails that are scheduled and due
  const now = new Date().toISOString()
  const { data: due, error } = await db
    .from('scheduled_emails')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!due || due.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  // Send each email directly — no internal HTTP fetch
  const results = await Promise.allSettled(
    due.map(e => sendScheduledEmail(e.id))
  )

  const sent     = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
  const failed   = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length
  const details  = results.map((r, i) => ({
    id: due[i].id,
    ...(r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason) }),
  }))

  return NextResponse.json({ ok: true, sent, failed, total: due.length, details })
}
