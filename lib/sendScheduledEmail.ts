/**
 * Core email send logic — used by both the API route (manual send)
 * and the cron (auto-send). Extracted so the cron doesn't need to
 * make an internal HTTP call to itself, avoiding double-timeout issues.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { buildEmailHtml, buildEmailText, RunInfo } from '@/lib/buildEmail'
import { ROUTES } from '@/lib/routes'

const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radcliffe.run'
const RESEND_KEY   = process.env.RESEND_API_KEY ?? ''
const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'noreply@radcliffe.run'
const FROM_NAME    = process.env.EMAIL_FROM_NAME ?? 'Run Together Radcliffe'
const BATCH_SIZE   = 50

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

export interface SendResult {
  ok: boolean
  sent: number
  failed: number
  errors?: string[]
  error?: string
  status?: number
}

export async function sendScheduledEmail(emailId: string): Promise<SendResult> {
  const db = supabaseAdmin()

  // Load the email draft
  const { data: email, error: emailErr } = await db
    .from('scheduled_emails')
    .select('*')
    .eq('id', emailId)
    .single()

  if (emailErr || !email) return { ok: false, sent: 0, failed: 0, error: 'Email not found', status: 404 }
  if (email.status === 'sent') return { ok: false, sent: 0, failed: 0, error: 'Already sent', status: 400 }

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
      .select('id, date, title, description, route_slug, distance_km, terrain, meeting_point, meeting_map_url, on_tour, has_jeffing, cancelled')
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

  // Build email content
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
    .select('id, email, first_name')
    .eq('status', 'active')
    .eq('email_opt_out', false)

  if (email.recipient_filter !== 'all') {
    recipientQuery = recipientQuery.eq('cohort', email.recipient_filter)
  }

  const { data: members, error: membersErr } = await recipientQuery
  if (membersErr) return { ok: false, sent: 0, failed: 0, error: membersErr.message, status: 500 }
  if (!members || members.length === 0) {
    return { ok: false, sent: 0, failed: 0, error: 'No recipients found', status: 400 }
  }

  // Build personalised payloads
  const payloads: ResendEmailPayload[] = members.map(m => {
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?id=${m.id}`
    return {
      from:    `${FROM_NAME} <${FROM_ADDRESS}>`,
      to:      [m.email],
      subject: email.subject,
      html:    html.replaceAll('{{UNSUBSCRIBE_URL}}', unsubscribeUrl),
      text:    text.replaceAll('{{UNSUBSCRIBE_URL}}', unsubscribeUrl),
    }
  })

  // Send in batches
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
    .eq('id', emailId)

  return {
    ok: true,
    sent: successCount,
    failed: failures.length,
    errors: failures.length > 0 ? failures : undefined,
  }
}
