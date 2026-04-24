import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import SignOutButton from './SignOutButton'

export const metadata = { title: 'My profile — radcliffe.run' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: member } = await supabaseAdmin()
    .from('members')
    .select('first_name, last_name, email, mobile, emergency_name, emergency_phone, emergency_relationship, medical_info, status, created_at')
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
          <p style={{ fontSize: 13, color: '#555', marginTop: 6 }}>
            Member since {joinedDate} &middot;{' '}
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: member.status === 'active' ? '#0d2a0d' : '#1a1a1a',
              color: member.status === 'active' ? '#4caf76' : '#555',
              border: `1px solid ${member.status === 'active' ? '#1a3d1a' : '#222'}`,
            }}>
              {member.status}
            </span>
          </p>
        </div>

        {/* Contact details */}
        <Section title="Your details">
          <Row label="Email"  value={member.email} />
          <Row label="Mobile" value={member.mobile ?? 'Not provided'} muted={!member.mobile} />
        </Section>

        {/* Emergency contact */}
        <Section title="Emergency contact">
          <Row label="Name"         value={member.emergency_name} />
          <Row label="Relationship" value={member.emergency_relationship} />
          <Row label="Phone"        value={member.emergency_phone} />
        </Section>

        {/* Medical info */}
        <Section title="Medical information">
          <Row
            label="Notes"
            value={member.medical_info ?? 'None provided'}
            muted={!member.medical_info}
          />
        </Section>

        {/* Coming soon */}
        <div style={{
          background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
          padding: '20px 24px', marginBottom: 24,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 4 }}>
            Profile editing &amp; notification preferences coming soon
          </p>
          <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
            To update any of your details in the meantime, contact a run leader or email the group.
          </p>
        </div>

        <SignOutButton />
      </main>
      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 2 }}>
        {title}
      </p>
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 20px', borderBottom: '1px solid #161616',
    }}>
      <p style={{ fontSize: 13, color: '#555', flexShrink: 0, marginRight: 16 }}>{label}</p>
      <p style={{ fontSize: 13, color: muted ? '#444' : '#ccc', textAlign: 'right' }}>{value}</p>
    </div>
  )
}
