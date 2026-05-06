import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import ProfileClient from './ProfileClient'

export const metadata = { title: 'My profile — radcliffe.run' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: member } = await supabaseAdmin()
    .from('members')
    .select('first_name, last_name, email, mobile, emergency_name, emergency_phone, emergency_relationship, medical_info, status, created_at, email_opt_out, photo_consent')
    .eq('email', user.email!)
    .single()

  if (!member) redirect('/join')

  const joinedDate = new Date(member.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'Inter, sans-serif' }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>
            Your account
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {member.first_name} {member.last_name}
          </h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            Member since {joinedDate} &middot;{' '}
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: member.status === 'active' ? '#0d2a0d' : '#1a1a1a',
              color: member.status === 'active' ? '#4caf76' : '#888',
              border: `1px solid ${member.status === 'active' ? '#1a3d1a' : '#222'}`,
            }}>
              {member.status}
            </span>
          </p>
        </div>

        <ProfileClient member={{
          first_name:              member.first_name,
          last_name:               member.last_name,
          email:                   member.email,
          mobile:                  member.mobile,
          emergency_name:          member.emergency_name,
          emergency_phone:         member.emergency_phone,
          emergency_relationship:  member.emergency_relationship,
          medical_info:            member.medical_info,
          email_opt_out:           member.email_opt_out ?? false,
          photo_consent:           member.photo_consent ?? false,
        }} />

      </main>
      <Footer />
    </>
  )
}
