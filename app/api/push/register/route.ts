import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { pushDeviceFields } from '@/lib/pushDeviceFields'

/**
 * POST /api/push/register
 * Upserts a native Expo push token:
 *   { token, platform, prefs, runtime?, update_id?, app_build? }.
 * Mirrors /api/push/subscribe (web push): no account needed - the member
 * link is attached opportunistically when the caller is signed in (cookie
 * or Bearer) so GDPR cleanup can cascade. last_seen_at refreshes on every
 * call; the GDPR cron prunes tokens unseen for ~12 months.
 *
 * runtime / update_id / app_build (Sept 2026) describe what the device is
 * running (lib/pushDeviceFields.ts); they make push_tokens the per-device
 * fleet record for both platforms. Optional, never a reason to refuse.
 */
export async function POST(req: NextRequest) {
  let body: {
    token?: string
    platform?: string
    prefs?: { weekly?: boolean; alerts?: boolean }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, platform, prefs } = body
  const device = pushDeviceFields(body)
  if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
  if (platform !== 'ios' && platform !== 'android') {
    return NextResponse.json({ error: 'platform must be ios or android' }, { status: 400 })
  }

  // Opportunistic member link - registration works signed out.
  let memberId: string | null = null
  try {
    const user = await getUserFromRequest(req)
    if (user?.email) {
      const { data: member } = await supabaseAdmin()
        .from('members')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()
      memberId = member?.id ?? null
    }
  } catch {
    // Non-fatal: token saved without member link
  }

  const { error } = await supabaseAdmin()
    .from('push_tokens')
    .upsert(
      {
        token,
        platform,
        member_id: memberId,
        prefs: {
          weekly: prefs?.weekly !== false,
          alerts: prefs?.alerts !== false,
        },
        last_seen_at: new Date().toISOString(),
        runtime: device.runtime,
        update_id: device.update_id,
        app_build: device.app_build,
      },
      { onConflict: 'token' }
    )

  if (error) {
    console.error('Push register error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/** DELETE /api/push/register - remove a token (opt-out of everything). */
export async function DELETE(req: NextRequest) {
  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }
  const { error } = await supabaseAdmin().from('push_tokens').delete().eq('token', body.token)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
