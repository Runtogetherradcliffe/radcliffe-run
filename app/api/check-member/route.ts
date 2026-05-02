import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Simple in-memory rate limiter — max 10 requests per 60 s per IP.
// Resets on cold start (fine for serverless; protects within a warm instance).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ found: false })

    const normalised = email.trim().toLowerCase()

    const { data } = await supabaseAdmin()
      .from('members')
      .select('email')
      .eq('email', normalised)
      .single()

    if (data) return NextResponse.json({ found: true })

    // Also allow Supabase auth users (admins) to sign in
    const { data: { users } } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 })
    const isAdmin = users.some(u => u.email === normalised)
    return NextResponse.json({ found: isAdmin })
  } catch {
    return NextResponse.json({ found: false })
  }
}
