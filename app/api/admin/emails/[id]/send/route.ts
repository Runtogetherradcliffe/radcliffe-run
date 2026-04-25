import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildEmailHtml, buildEmailText, RunInfo } from '@/lib/buildEmail'
import { ROUTES } from '@/lib/routes'

const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radcliffe.run'
const RESEND_KEY   = process.env.RESEND_API_KEY ?? ''
const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'noreply@radcliffe.run'
const FROM_NAME    = process.env.EMAIL_FROM_NAME ?? 'Run Together Radcliffe'
const CRON_SECRET  = process.env.CRON_SECRET ?? ''
const BATCH_SIZE   = 50  // Resend batch limit per request

interface ResendEmailPayload {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
}

async function sendBatch(emails: ResendEmailPayload[]): Promise<{ ok: boolean; errors: string[] }> {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emails),
  })
  if (!res.ok) {
    const err = await res.text()
    return { ok: false, errors: [err] }
  }
  return { ok: true, errors: [] }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Allow cron internal calls (no user session) via shared secret header
  const isCron = CRON_SECRET && req.headers.get('x-cron-internal') === CRON_SECRET
  if (!isCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const db = supabaseAdmin()

  // Load the email draft
  const { data: email, error: emailErr } = await db
    .from('scheduled_emails')
    .select('*')
    .eq('id', id)
    .single()

  if (emailErr || !email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  if (email.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 400 })

  // Load site settings for defaults
  const { data: settings } = await db
    .from('site_settings')
    .select('email_default_opening, email_default_closing')
    .single()

  // Load runs for the Thursday date
  let runs: RunInfo[] = []
  if (email.show_route_block && email.thursday_date) {
    const { data: runRows } = await db
      .from('runs')
      .select('id, date, title, description, route_slug, distance_km, terrain, meeting_point, on_tour, cancelled')
      .eq('date', email.thursday_date)
      .eq('cancelled', false)
      .neq('run_type', 'social')
      .order('distance_km', { ascending: true })

    runs = (runRows ?? []).map(r => {
      const route = r.route_slug ? ROUTES.find(ro => ro.slug === r.route_slug) : null
      return {
        date:            r.date,
        title:           r.title,
        distance_km:     r.distance_km,
        description:     route?.description ?? r.description ?? null,
        route_slug:      r.route_slug,
        meeting_point:   r.meeting_point,
        meeting_map_url: r.meeting_map_url ?? null,
        on_tour:         r.on_tour ?? false,
        has_jeffing:     r.has_jeffing ?? false,
        terrain:         r.terrain,
      }
    })
  }

  // Build HTML
  const emailData = {
    subject:        email.subject,
    showOpening:    email.show_opening,
    openingText:    email.opening_text ?? settings?.email_default_opening ?? '',
    runs,
    showRouteBlock: email.show_route_block,
    customText:     email.custom_text,
    showClosing:    email.show_closing,
    closingText:    email.closing_text ?? settings?.email_default_closing ?? '',
    siteUrl:        SITE_URL,
  }
  const html = buildEmailHtml(emailData)
  const text = buildEmailText(emailData)

  // Load recipients
  let recipientQuery = db
    .from('members')
    .select('email, first_name')
    .eq('status', 'active')

  if (email.recipient_filter !== 'all') {
    recipientQuery = recipientQuery.eq('cohort', email.recipient_filter)
  }

  const { data: members, error: membersErr } = await recipientQuery
  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 500 })
  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  // Build batch payloads (one email per recipient for clean delivery)
  const payloads: ResendEmailPayload[] = members.map(m => ({
    from:    `${FROM_NAME} <${FROM_ADDRESS}>`,
    to:      [m.email],
    subject: email.subject,
    html,
    text,
  }))

  // Send in batches of BATCH_SIZE
  let successCount = 0
  const failures: string[] = []
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const chunk = payloads.slice(i, i + BATCH_SIZE)
    const result = await sendBatch(chunk)
    if (result.ok) {
      successCount += chunk.length
    } else {
      failures.push(...result.errors)
    }
  }

  // Mark as sent
  await db
    .from('scheduled_emails')
    .update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: successCount })
    .eq('id', id)

  return NextResponse.json({
    ok: true,
    sent: successCount,
    failed: failures.length,
    errors: failures.length > 0 ? failures : undefined,
  })
}
