import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ found: false })

    const { data } = await supabaseAdmin()
      .from('members')
      .select('email')
      .eq('email', email.trim().toLowerCase())
      .single()

    return NextResponse.json({ found: !!data })
  } catch {
    return NextResponse.json({ found: false })
  }
}
