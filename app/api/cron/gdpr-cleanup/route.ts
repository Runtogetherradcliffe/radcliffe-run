/**
 * GET /api/cron/gdpr-cleanup
 * Called by Vercel Cron (daily). Enforces the retention policy from /privacy:
 *   - Members deactivated >1 year ago: delete entire row + auth user
 *   - Email send log entries >1 year old: delete
 * Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET

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

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const cutoff = oneYearAgo.toISOString()

  // 1. Find members deactivated more than 1 year ago
  const { data: staleMembers, error: fetchError } = await db
    .from('members')
    .select('id, email')
    .eq('status', 'inactive')
    .not('deactivated_at', 'is', null)
    .lte('deactivated_at', cutoff)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  let membersDeleted = 0

  if (staleMembers && staleMembers.length > 0) {
    const ids = staleMembers.map(m => m.id)

    // Delete push subscriptions linked to these members
    await db.from('push_subscriptions').delete().in('member_id', ids)

    // Delete the member rows
    const { error: deleteError } = await db
      .from('members')
      .delete()
      .in('id', ids)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    membersDeleted = ids.length

    // Delete auth users (best-effort — member data already gone)
    for (const member of staleMembers) {
      const { data: authUsers } = await db.auth.admin.listUsers()
      const authUser = authUsers?.users?.find(u => u.email === member.email)
      if (authUser) {
        await db.auth.admin.deleteUser(authUser.id)
      }
    }
  }

  // 2. Delete email send log entries older than 1 year
  const { count: logsDeleted, error: logError } = await db
    .from('email_send_log')
    .delete({ count: 'exact' })
    .lte('sent_at', cutoff)

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    membersDeleted,
    emailLogsDeleted: logsDeleted ?? 0,
    cutoffDate: cutoff,
  })
}
