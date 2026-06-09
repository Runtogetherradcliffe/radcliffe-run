/**
 * Shared unsubscribe logic: HMAC token generation + verification + opt-out.
 * Used by the newsletter sender (`lib/sendScheduledEmail.ts`), the friendly
 * `/unsubscribe` page, and the `/api/unsubscribe` route (List-Unsubscribe
 * one-click). Keeping it in one place ensures the token implementation cannot
 * drift between where links are signed and where they are verified.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET ?? ''

/** HMAC-SHA256 token for a member ID so unsubscribe links cannot be forged
 *  or used to opt out arbitrary members. */
export function makeUnsubscribeToken(memberId: string): string {
  if (!UNSUBSCRIBE_SECRET) throw new Error('UNSUBSCRIBE_SECRET env var is not set')
  return createHmac('sha256', UNSUBSCRIBE_SECRET).update(memberId).digest('hex')
}

/** Constant-time verification of an unsubscribe token. */
export function verifyUnsubscribeToken(memberId: string, token: string): boolean {
  if (!UNSUBSCRIBE_SECRET) return false
  try {
    const expected = createHmac('sha256', UNSUBSCRIBE_SECRET).update(memberId).digest()
    const provided = Buffer.from(token, 'hex')
    if (expected.length !== provided.length) return false
    return timingSafeEqual(expected, provided)
  } catch {
    return false
  }
}

export type OptOutResult = 'ok' | 'already' | 'invalid' | 'error'

/** Verify the token, then set `email_opt_out` on the member. Idempotent:
 *  a member who is already opted out returns 'already'. */
export async function optOutMember(memberId: string, token: string): Promise<OptOutResult> {
  if (!verifyUnsubscribeToken(memberId, token)) return 'invalid'

  const db = supabaseAdmin()
  const { data: member } = await db
    .from('members')
    .select('email_opt_out')
    .eq('id', memberId)
    .single()

  if (!member) return 'invalid'
  if (member.email_opt_out) return 'already'

  const { error } = await db
    .from('members')
    .update({ email_opt_out: true })
    .eq('id', memberId)

  return error ? 'error' : 'ok'
}
