import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

const supabaseAdminDirect = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/push/subscribe — save a push subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
    }

    // Look up the authenticated member's id so we can link the subscription for GDPR cleanup
    let memberId: string | null = null
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: member } = await supabaseAdmin()
          .from('members')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()
        memberId = member?.id ?? null
      }
    } catch {
      // Non-fatal: subscription saved without member link
    }

    const { error } = await supabaseAdminDirect
      .from('push_subscriptions')
      .upsert(
        { endpoint, p256dh: keys.p256dh, auth: keys.auth, member_id: memberId },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('Subscribe error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/push/subscribe — remove a push subscription
export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      console.error('Unsubscribe error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
