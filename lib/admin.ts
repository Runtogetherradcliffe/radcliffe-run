import { createClient } from '@/utils/supabase/server'

const FALLBACK_ADMIN_EMAILS = ['paul.j.cox@gmail.com', 'pjcox@fastmail.fm', 'runtogetherradcliffe@gmail.com']

function getAdminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS ?? ''
  const fromEnv = env.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return fromEnv.length > 0 ? fromEnv : FALLBACK_ADMIN_EMAILS
}

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !getAdminEmails().includes((user.email ?? '').toLowerCase())) return null
  return user
}
