import { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Resolve the authenticated user from a request, accepting BOTH transports:
 *   - session cookies (the website, via @supabase/ssr)
 *   - Authorization: Bearer <supabase access token> (the native app)
 * The Bearer path validates the JWT against Supabase Auth (server-side),
 * so it carries exactly the same trust as a cookie session. Added Jul 2026
 * for the native app (NATIVE_APP_SCOPE.md section 5) - deliberately AFTER
 * the requireAdmin()/RLS hardening, since it widens how authenticated
 * requests reach the server.
 */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    if (token) {
      const { data, error } = await supabaseAdmin().auth.getUser(token)
      if (!error && data.user) return data.user
    }
    return null // an explicit Bearer that fails must NOT fall back to cookies
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export interface LeaderIdentity {
  user: User
  memberId: string
}

/**
 * Require an authenticated run leader (cookie or Bearer). Mirrors the gate
 * in app/api/leader/member/[id]/route.ts: session first, then is_run_leader
 * looked up by email on the service role. Returns null when not a leader.
 */
export async function requireLeader(req: NextRequest): Promise<LeaderIdentity | null> {
  const user = await getUserFromRequest(req)
  if (!user?.email) return null
  const { data: member } = await supabaseAdmin()
    .from('members')
    .select('id, is_run_leader')
    .eq('email', user.email)
    .maybeSingle()
  if (!member?.is_run_leader) return null
  return { user, memberId: member.id }
}
