/**
 * GET /api/cron/send-emails
 * Called by Vercel Cron (every hour). Finds any scheduled emails
 * whose scheduled_for time has passed and fires them.
 * Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET ?? ''
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radcliffe.run'

export async function GET(req: NextRequest) {
  // Verify secret header (set in vercel.json cron config)
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

  // Trigger send for each via internal API
  const results = await Promise.allSettled(
    due.map(e =>
      fetch(`${SITE_URL}/api/admin/emails/${e.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-internal': CRON_SECRET,
        },
      }).then(r => r.json())
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ ok: true, sent, total: due.length })
}
