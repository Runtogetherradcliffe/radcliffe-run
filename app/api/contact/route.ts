import { NextRequest, NextResponse } from 'next/server'

const RESEND_KEY = process.env.RESEND_API_KEY ?? ''
const FROM       = process.env.EMAIL_FROM ?? 'hello@radcliffe.run'
const FROM_NAME  = process.env.EMAIL_FROM_NAME ?? 'Run Together Radcliffe'

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM}>`,
      to:   ['hello@radcliffe.run'],
      reply_to: email.trim(),
      subject: `Contact form: ${name.trim()}`,
      text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
      html: `<p><strong>Name:</strong> ${name.trim()}</p><p><strong>Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p><hr><p>${message.trim().replace(/\n/g, '<br>')}</p>`,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
