import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin'
import webpush from 'web-push'
import { loadPushTokens, sendExpoPush } from '@/lib/expoPush'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/notify - send a push notification to all subscribers
export async function POST(request: NextRequest) {
  // Verify admin session
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Initialise VAPID inside handler (not module level) so it never runs at build time
  webpush.setVapidDetails(
    'mailto:paul.j.cox@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const { title, body, url } = await request.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  // Fetch all subscriptions
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const webSubs = subscriptions ?? []

  const payload = JSON.stringify({
    title: title.trim(),
    body: body.trim(),
    url: url?.trim() || '/',
    tag: 'rtr-notification',
  })

  // Send to all subscribers
  const results = await Promise.allSettled(
    webSubs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  // Clean up expired/invalid subscriptions (HTTP 404 or 410)
  const expiredEndpoints: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const msg = String((result.reason as Error).message ?? '')
      if (msg.includes('404') || msg.includes('410')) {
        expiredEndpoints.push(webSubs[i].endpoint)
      }
    }
  })
  if (expiredEndpoints.length > 0) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  // Native devices (Expo push, added Jul 2026): manual broadcasts ride the
  // 'alerts' preference. Reach is reported per channel.
  const expoTokens = await loadPushTokens('alerts')
  const expo = await sendExpoPush(expoTokens, {
    title: title.trim(),
    body: body.trim(),
    url: url?.trim() || '/',
  })

  return NextResponse.json({
    sent: sent + expo.sent,
    failed: failed + expo.failed,
    total: webSubs.length + expoTokens.length,
    channels: {
      web: { sent, failed, total: webSubs.length },
      expo: { sent: expo.sent, failed: expo.failed, total: expoTokens.length },
    },
  })
}
