import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_FIELDS = [
  'first_name', 'last_name', 'mobile',
  'emergency_name', 'emergency_phone', 'emergency_relationship',
  'medical_info', 'email_opt_out', 'photo_consent',
  'theme', 'font_size',
  'awards_public', // recognition consent: private by default, opt-in public
  'development_preference', // runner-home development ask: skippable, editable forever
]

// PATCH /api/profile - update the authenticated member's own record
// (cookie or Bearer - the native app authenticates with a Supabase JWT)
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Only allow whitelisted fields to be updated
  const update: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('members')
    .update(update)
    .eq('email', user.email)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/profile - permanently delete the authenticated member's account
// (cookie or Bearer - the in-app account-deletion screen calls this)
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.email || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()

  // Look up the member's id before deletion (needed for push subscription cleanup)
  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  // Delete the member row (removes all personal data, emergency contact, medical info)
  const { error: memberError } = await admin
    .from('members')
    .delete()
    .eq('email', user.email)

  if (memberError) {
    console.error('Delete member error:', memberError)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  // Remove any push subscriptions and native push tokens for this member
  // (the push_tokens FK cascades on member delete, but the member row is
  // deleted by email above - belt and braces for both token stores)
  if (member?.id) {
    await admin.from('push_subscriptions').delete().eq('member_id', member.id)
    await admin.from('push_tokens').delete().eq('member_id', member.id)
  }

  // Delete the Supabase auth user entirely
  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) {
    // Non-fatal: member data already gone, log and continue
    console.error('Delete auth user error:', authError)
  }

  return NextResponse.json({ success: true })
}
