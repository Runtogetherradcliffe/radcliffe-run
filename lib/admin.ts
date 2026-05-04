import { createClient } from '@/utils/supabase/server'

function getAdminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS ?? ''
  return env.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !getAdminEmails().includes((user.email ?? '').toLowerCase())) return null
  return user
}
