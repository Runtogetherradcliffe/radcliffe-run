import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { sendScheduledEmail } from '@/lib/sendScheduledEmail'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Allow cron internal calls (no user session) via shared secret header
  const cronHeader = req.headers.get('x-cron-internal')
  const isCron = CRON_SECRET && cronHeader === CRON_SECRET

  if (!isCron) {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await sendScheduledEmail(id)

  if (!result.ok && result.status) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: result.ok,
    sent: result.sent,
    failed: result.failed,
    errors: result.errors,
  })
}
