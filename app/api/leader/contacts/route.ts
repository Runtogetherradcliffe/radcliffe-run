import { NextRequest, NextResponse } from 'next/server'
import { requireLeader } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/leader/contacts
 * The full active-member emergency set for the native app's leader lookup,
 * in one response so the app can hold an encrypted on-device cache for the
 * offline incident case (NATIVE_APP_SCOPE.md sections 5 and 8 item 15).
 * Auth: run leaders only, cookie or Bearer. The web leader page keeps its
 * on-demand per-member PII route; this endpoint exists for the app cache.
 * Includes each member's most recent attendance group as a display hint.
 */
export async function GET(req: NextRequest) {
  const leader = await requireLeader(req)
  if (!leader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = supabaseAdmin()
  const { data: members, error } = await db
    .from('members')
    .select(
      'id, first_name, last_name, mobile, emergency_name, emergency_phone, emergency_relationship, medical_info, photo_consent, created_at'
    )
    .eq('status', 'active')
    .order('first_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Most recent group per member (display hint on roster/contact rows).
  const { data: recent } = await db
    .from('attendance')
    .select('member_id, group_key, recorded_at')
    .not('group_key', 'is', null)
    .order('recorded_at', { ascending: false })
    .limit(500)

  const lastGroup = new Map<string, string>()
  for (const row of recent ?? []) {
    if (row.group_key && !lastGroup.has(row.member_id)) {
      lastGroup.set(row.member_id, row.group_key)
    }
  }

  return NextResponse.json({
    members: (members ?? []).map(m => ({
      ...m,
      photo_consent: !!m.photo_consent,
      group_key: lastGroup.get(m.id) ?? null,
    })),
  })
}
