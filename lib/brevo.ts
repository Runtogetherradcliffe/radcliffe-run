/**
 * Brevo (transactional) email helper.
 * Single send endpoint for all outgoing mail: the weekly newsletter,
 * the welcome email, and the contact form. Replaces the previous
 * direct Resend API calls.
 *
 * Brevo transactional API: POST https://api.brevo.com/v3/smtp/email
 * Auth via the `api-key` header (not a Bearer token).
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? ''

export interface BrevoRecipient {
  email: string
  name?: string
}

export interface BrevoEmail {
  sender: BrevoRecipient
  to: BrevoRecipient[]
  subject: string
  htmlContent: string
  textContent?: string
  replyTo?: BrevoRecipient
  /** Extra SMTP headers, e.g. List-Unsubscribe pointing at our own endpoint. */
  headers?: Record<string, string>
}

export interface BrevoSendResult {
  ok: boolean
  status: number
  messageId?: string
  error?: string
}

/** Send a single transactional email via Brevo. Never throws - returns a result. */
export async function sendBrevoEmail(email: BrevoEmail): Promise<BrevoSendResult> {
  if (!BREVO_API_KEY) {
    return { ok: false, status: 0, error: 'BREVO_API_KEY is not set' }
  }

  let res: Response
  try {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(email),
    })
  } catch (err) {
    return { ok: false, status: 0, error: String(err) }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, status: res.status, error: text }
  }

  const data = await res.json().catch(() => ({} as { messageId?: string }))
  return { ok: true, status: res.status, messageId: data.messageId }
}
