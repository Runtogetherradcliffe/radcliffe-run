import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'
import { buildEmailHtml, RunInfo } from '@/lib/buildEmail'
import { loadEmailRuns } from '@/lib/emailRuns'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.radcliffe.run'

/** POST body can override any field for live preview as the user edits */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const overrides = await req.json().catch(() => ({}))
  const { id } = await params
  const db = supabaseAdmin()

  // Load saved email (or use defaults if id === 'new')
  let base: Record<string, unknown> = {}
  if (id !== 'new') {
    const { data } = await db.from('scheduled_emails').select('*').eq('id', id).single()
    base = data ?? {}
  }

  // Load site settings for defaults
  const { data: settings } = await db
    .from('site_settings')
    .select('email_default_opening, email_default_closing')
    .single()

  const merged = { ...base, ...overrides }

  // Load runs for the Thursday date
  let runs: RunInfo[] = []
  const thursdayDate = merged.thursday_date as string | null
  if (merged.show_route_block !== false && thursdayDate) {
    runs = await loadEmailRuns(db, thursdayDate, merged.recipient_filter as string | null)
  }

  const html = buildEmailHtml({
    subject:        (merged.subject as string) ?? '',
    showOpening:    (merged.show_opening as boolean) ?? true,
    openingText:    (merged.opening_text as string) ?? settings?.email_default_opening ?? '',
    runs,
    showRouteBlock: (merged.show_route_block as boolean) ?? true,
    customText:     (merged.custom_text as string) ?? null,
    showClosing:    (merged.show_closing as boolean) ?? true,
    closingText:    (merged.closing_text as string) ?? settings?.email_default_closing ?? '',
    siteUrl:        SITE_URL,
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
