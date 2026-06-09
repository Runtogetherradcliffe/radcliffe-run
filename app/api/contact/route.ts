import { NextRequest, NextResponse } from 'next/server'
import { sendBrevoEmail } from '@/lib/brevo'

const FROM       = process.env.EMAIL_FROM ?? 'hello@radcliffe.run'
const FROM_NAME  = process.env.EMAIL_FROM_NAME ?? 'Run Together Radcliffe'

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const result = await sendBrevoEmail({
    sender:      { name: FROM_NAME, email: FROM },
    to:          [{ email: 'hello@radcliffe.run' }],
    replyTo:     { email: email.trim(), name: name.trim() },
    subject:     `Contact form: ${name.trim()}`,
    textContent: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
    htmlContent: `<p><strong>Name:</strong> ${name.trim()}</p><p><strong>Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p><hr><p>${message.trim().replace(/\n/g, '<br>')}</p>`,
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
