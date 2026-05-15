import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_FIELDS = [
  'first_name', 'last_name', 'mobile',
  'emergency_name', 'emergency_phone', 'emergency_relationship',
  'medical_info', 'email_opt_out', 'photo_consent',
  'theme', 'font_size',
]

// PATCH /api/profile — update the authenticated member's own record
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

// DELETE /api/profile — permanently delete the authenticated member's account
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()

  // Delete the member row (removes all personal data, emergency contact, medical info)
  const { error: memberError } = await admin
    .from('members')
    .delete()
    .eq('email', user.email)

  if (memberError) {
    console.error('Delete member error:', memberError)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  // Remove any push subscriptions for this user
  await admin.from('push_subscriptions').delete().eq('user_id', user.id)

  // Delete the Supabase auth user entirely
  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) {
    // Non-fatal: member data already gone, log and continue
    console.error('Delete auth user error:', authError)
  }

  return NextResponse.json({ success: true })
}
