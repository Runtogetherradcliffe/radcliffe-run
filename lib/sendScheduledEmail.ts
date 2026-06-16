/**
 * Core email send logic - used by both the API route (manual send)
 * and the cron (auto-send). Extracted so the cron doesn't need to
 * make an internal HTTP call to itself, avoiding double-timeout issues.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { buildEmailHtml, buildEmailText, RunInfo } from '@/lib/buildEmail'
import { ROUTES } from '@/lib/routes'
import { getRouteOverrides } from '@/lib/routeDescriptions'
import { sendBrevoEmail } from '@/lib/brevo'
import { makeUnsubscribeToken } from '@/lib/unsubscribe'

const SITE_URL           = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radcliffe.run'
const FROM_ADDRESS       = process.env.EMAIL_FROM ?? 'noreply@radcliffe.run'
const FROM_NAME          = process.env.EMAIL_FROM_NAME ?? 'Run Together Radcliffe'
// Brevo transactional sends are one request per recipient, so each member gets
// a personalised unsubscribe link in the body *and* a matching List-Unsubscribe
// header. Cap how many run at once to stay within Brevo's rate limit. At ~0.5s
// per send this is ~10 requests/sec peak; 100 members complete in ~10s, well
// inside the 60s function budget (see maxDuration on the cron + send routes).
const SEND_CONCURRENCY   = 5

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
  // Fail fast on a missing subject: providers reject an empty subject, so without
  // this every per-member send would fail and report a generic error.
  if (!email.subject || !email.subject.trim()) {
    return { ok: false, sent: 0, failed: 0, error: 'This email has no subject line. Add one before sending.', status: 400 }
  }

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

    const overrides = await getRouteOverrides()

    runs = (runRows ?? []).map(r => {
      const route = r.route_slug ? ROUTES.find(ro => ro.slug === r.route_slug) : null
      return {
        date:            r.date,
        title:           r.title,
        distance_km:     r.distance_km,
        description:     (r.route_slug && overrides[r.route_slug]?.description) ? overrides[r.route_slug].description! : (route?.description ?? r.description ?? null),
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

  // Load recipients. Always restricted to active, non-opted-out members.
  let recipientQuery = db
    .from('members')
    .select('id, email, first_name')
    .eq('status', 'active')
    .eq('email_opt_out', false)

  if (email.recipient_filter === 'selected') {
    // Targeted send to a hand-picked list of member ids.
    const ids = (email.recipient_member_ids ?? []) as string[]
    if (ids.length === 0) {
      return { ok: false, sent: 0, failed: 0, error: 'No members selected', status: 400 }
    }
    recipientQuery = recipientQuery.in('id', ids)
  } else if (email.recipient_filter !== 'all') {
    recipientQuery = recipientQuery.eq('cohort', email.recipient_filter)
  }

  const { data: members, error: membersErr } = await recipientQuery
  if (membersErr) return { ok: false, sent: 0, failed: 0, error: membersErr.message, status: 500 }
  if (!members || members.length === 0) {
    return { ok: false, sent: 0, failed: 0, error: 'No recipients found', status: 400 }
  }

  // Claim this send so two triggers (e.g. the Vercel cron and an external cron
  // backstop) cannot both deliver it. Atomically stamp sent_at while the status
  // is still its current value: whoever wins proceeds, the loser gets zero rows
  // back and stops. A claim older than 10 minutes is treated as stale (a crashed
  // run) and may be reclaimed. No new status value is used, so no DB migration.
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: claimed } = await db
    .from('scheduled_emails')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', emailId)
    .eq('status', email.status)
    .or(`sent_at.is.null,sent_at.lt.${staleBefore}`)
    .select('id')
  if (!claimed || claimed.length === 0) {
    return { ok: false, sent: 0, failed: 0, error: 'Email is already being sent by another run', status: 409 }
  }

  // Send one personalised email per member. Each gets a unique unsubscribe URL
  // baked into the body and a List-Unsubscribe header pointing at our own
  // /unsubscribe endpoint, so opting out (in-body link or the mail client's
  // native unsubscribe) updates our database.
  let successCount = 0
  const failures: string[] = []

  const sendToMember = async (m: { id: string; email: string; first_name: string | null }) => {
    const token = makeUnsubscribeToken(m.id)
    // In-body link goes to the friendly /unsubscribe page; the List-Unsubscribe
    // header points at /api/unsubscribe, which handles the mail client's
    // one-click POST (a page.tsx cannot). Both opt the member out in our DB.
    const pageUrl   = `${SITE_URL}/unsubscribe?id=${m.id}&token=${token}`
    const headerUrl = `${SITE_URL}/api/unsubscribe?id=${m.id}&token=${token}`
    const result = await sendBrevoEmail({
      sender:      { name: FROM_NAME, email: FROM_ADDRESS },
      to:          [{ email: m.email, name: m.first_name ?? undefined }],
      subject:     email.subject,
      htmlContent: html.replaceAll('{{UNSUBSCRIBE_URL}}', pageUrl),
      textContent: text.replaceAll('{{UNSUBSCRIBE_URL}}', pageUrl),
      // Brevo adds `List-Unsubscribe-Post: One-Click` itself. We only set the
      // URL. /api/unsubscribe handles both the one-click POST and a plain GET,
      // so opt-out works whether or not the client uses one-click.
      headers: { 'List-Unsubscribe': `<${headerUrl}>` },
    })
    if (result.ok) successCount++
    else failures.push(`${m.email}: ${result.error ?? 'unknown error'}`)
  }

  // Bounded concurrency - process SEND_CONCURRENCY members at a time.
  for (let i = 0; i < members.length; i += SEND_CONCURRENCY) {
    await Promise.all(members.slice(i, i + SEND_CONCURRENCY).map(sendToMember))
  }

  // Only mark as sent if at least one email actually went out. If every send
  // failed (bad API key, Brevo outage, etc.) leave the email 'scheduled' so the
  // next cron run retries it, rather than silently swallowing the newsletter.
  // A partial failure still marks sent: the members who received it must not be
  // re-emailed on the next run.
  if (successCount === 0) {
    // Release the claim (clear sent_at) so the next run can retry promptly,
    // rather than waiting for the 10-minute stale-claim window.
    await db.from('scheduled_emails').update({ sent_at: null }).eq('id', emailId)
    return {
      ok: false,
      sent: 0,
      failed: failures.length,
      errors: failures.length > 0 ? failures : undefined,
      error: 'All sends failed; email left scheduled for retry',
      status: 502,
    }
  }

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
