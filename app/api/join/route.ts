import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function escapeHtml(str: string) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

async function sendWelcomeEmail(firstName: string, email: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.EMAIL_FROM
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Run Together Radcliffe'
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radcliffe.run'
  if (!apiKey || !from) return

  // Fetch next upcoming run
  const today = new Date().toISOString().split('T')[0]
  const { data: run } = await supabaseAdmin()
    .from('runs')
    .select('title, date, meeting_point')
    .eq('run_type', 'regular')
    .eq('cancelled', false)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1)
    .single()

  const runBlock = run ? `
    <tr><td style="padding:0 0 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-radius:8px;border-left:4px solid #f5a623">
        <tr><td style="padding:16px 20px">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#f5a623">Next run</p>
          <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#111">${escapeHtml(run.title)}</p>
          <p style="margin:0;font-size:13px;color:#555">${fmtDate(run.date)} &middot; 7:00pm &middot; ${escapeHtml(run.meeting_point)}</p>
        </td></tr>
      </table>
    </td></tr>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0f0f0;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 20px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#0a0a0a;padding:24px 32px">
      <p style="margin:0;font-size:20px;font-weight:700;color:#fff">radcliffe.<span style="color:#f5a623">run</span></p>
    </td></tr>
    <tr><td style="padding:32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 0 20px">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#111">Welcome, ${escapeHtml(firstName)}! 💜</h1>
        </td></tr>
        <tr><td style="padding:0 0 20px">
          <p style="margin:0;font-size:15px;color:#444;line-height:1.7">You&rsquo;re now registered with Run Together Radcliffe. We meet every Thursday at 7pm &mdash; no need to book, just turn up.</p>
        </td></tr>
        ${runBlock}
        <tr><td style="padding:0 0 24px;text-align:center">
          <a href="${siteUrl}/signin" style="display:inline-block;background:#f5a623;color:#0a0a0a;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">Sign in to your profile</a>
        </td></tr>
        <tr><td style="padding:16px 0 0;border-top:1px solid #eee">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6">Run Together Radcliffe &middot; Radcliffe Market, Blackburn Street, M26 1PN<br>Questions? Reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </td></tr></table></body></html>`

  const text = `Welcome to Run Together Radcliffe, ${firstName}!\n\nYou're registered. We meet every Thursday at 7pm at Radcliffe Market — no need to book.\n\n${run ? `Next run: ${run.title} on ${fmtDate(run.date)} at 7pm, ${run.meeting_point}\n\n` : ''}Sign in to your profile: ${siteUrl}/signin\n\nRun Together Radcliffe · Radcliffe Market, Blackburn Street, M26 1PN`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${fromName} <${from}>`,
      to: [email],
      subject: `Welcome to Run Together Radcliffe, ${firstName}!`,
      html,
      text,
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      firstName, lastName, email, mobile,
      emergencyName, emergencyPhone, emergencyRelationship,
      healthDeclaration, healthNotes, consentData,
      consentEmail, consentPhoto, consentMedical,
    } = body

    // Basic server-side validation
    if (!firstName || !lastName || !email || !emergencyName || !emergencyPhone || !emergencyRelationship) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!consentData || !healthDeclaration) {
      return NextResponse.json({ error: 'Consent and health declaration required' }, { status: 400 })
    }

    const normalEmail = email.trim().toLowerCase()

    // Check for existing registration before inserting
    const db = supabaseAdmin()
    const { data: existing } = await db
      .from('members')
      .select('id')
      .eq('email', normalEmail)
      .maybeSingle()

    if (existing) {
      // Already registered — fire an OTP so they can sign in, then tell the frontend
      await supabaseAdmin().auth.admin.generateLink({
        type: 'magiclink',
        email: normalEmail,
      }).catch(() => {/* best-effort */})
      await supabaseAdmin().auth.signInWithOtp({ email: normalEmail })
        .catch(() => {/* best-effort */})
      return NextResponse.json({ alreadyRegistered: true })
    }

    const { error } = await db.from('members').insert({
      first_name:               firstName,
      last_name:                lastName,
      email:                    normalEmail,
      mobile:                   mobile || null,
      emergency_name:           emergencyName,
      emergency_phone:          emergencyPhone,
      emergency_relationship:   emergencyRelationship,
      medical_info:             healthNotes || null,
      consent_data:             consentData,
      health_declaration:       healthDeclaration,
      email_opt_out:            !consentEmail,
      photo_consent:            !!consentPhoto,
      consent_medical:          !!consentMedical,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save registration' }, { status: 500 })
    }

    // Create a confirmed auth user so subsequent signInWithOtp sends a code (not a confirmation email)
    await supabaseAdmin().auth.admin.createUser({
      email: normalEmail,
      email_confirm: true,
    }).catch(err => console.error('Auth user creation failed (may already exist):', err))

    // Send welcome email (fire and forget — don't block the response)
    sendWelcomeEmail(firstName, normalEmail).catch(err =>
      console.error('Welcome email failed:', err)
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Join API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
