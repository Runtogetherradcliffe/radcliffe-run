/**
 * /api/unsubscribe - the target of the `List-Unsubscribe` header.
 *
 * POST: RFC 8058 one-click unsubscribe. Mail clients (Gmail, Apple Mail) send
 *       a POST here when the user taps the native "Unsubscribe" button. We opt
 *       the member out and return 200 with no body.
 * GET:  fallback for clients that just open the URL in a browser. We redirect
 *       to the friendly /unsubscribe page, which performs the opt-out and shows
 *       a confirmation.
 *
 * The visible in-body unsubscribe link points at the /unsubscribe page directly;
 * this route exists specifically so the native one-click POST has somewhere to
 * land (a page.tsx cannot handle POST).
 */
import { NextRequest, NextResponse } from 'next/server'
import { optOutMember } from '@/lib/unsubscribe'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const token = searchParams.get('token')

  if (!id || !token) return new NextResponse('Bad request', { status: 400 })

  const result = await optOutMember(id, token)
  if (result === 'invalid') return new NextResponse('Invalid link', { status: 400 })
  if (result === 'error')   return new NextResponse('Server error', { status: 500 })

  // 'ok' or 'already' - both are a success from the client's perspective.
  return new NextResponse(null, { status: 200 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = new URL('/unsubscribe', req.url)
  for (const key of ['id', 'token']) {
    const value = searchParams.get(key)
    if (value) url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url)
}
