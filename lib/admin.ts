import { createClient } from '@/utils/supabase/server'

const ADMIN_EMAILS = ['paul.j.cox@gmail.com', 'runtogetherradcliffe@gmail.com']

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}
