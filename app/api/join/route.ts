import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      firstName, lastName, email, mobile,
      emergencyName, emergencyPhone, emergencyRelationship,
      healthDeclaration, healthNotes, consentData,
      consentEmail, consentPhoto,
    } = body

    // Basic server-side validation
    if (!firstName || !lastName || !email || !emergencyName || !emergencyPhone || !emergencyRelationship) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!consentData || !healthDeclaration) {
      return NextResponse.json({ error: 'Consent and health declaration required' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { error } = await db.from('members').insert({
      first_name:               firstName,
      last_name:                lastName,
      email:                    email.trim().toLowerCase(),
      mobile:                   mobile || null,
      emergency_name:           emergencyName,
      emergency_phone:          emergencyPhone,
      emergency_relationship:   emergencyRelationship,
      medical_info:             healthNotes || null,
      consent_data:             consentData,
      health_declaration:       healthDeclaration,
      // Honour email preference: opt_out is the inverse of opting in
      email_opt_out:            !consentEmail,
      photo_consent:            !!consentPhoto,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save registration' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Join API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
