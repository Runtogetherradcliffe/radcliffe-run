import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import BackLink from './BackLink'

export const metadata = {
  title: 'Privacy Policy — radcliffe.run',
  description: 'How Run Together Radcliffe collects, uses, and protects your personal data.',
}

type Props = { searchParams: Promise<{ modal?: string }> }

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#f5a623',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, marginTop: 40,
}

const headStyle: React.CSSProperties = {
  fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12, marginTop: 40, color: '#fff',
}

const paraStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 300, color: '#aaa', lineHeight: 1.8, marginBottom: 12,
}

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid #1a1a1a',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 14, color: '#aaa', lineHeight: 1.6, verticalAlign: 'top',
}

const tdLabelStyle: React.CSSProperties = {
  ...tdStyle, color: '#666', width: '30%', fontWeight: 500,
}

export default async function PrivacyPage({ searchParams }: Props) {
  const { modal } = await searchParams
  const isModal = modal === '1'
  return (
    <>
      {!isModal && <Nav />}
      <main style={{ minHeight: isModal ? 'auto' : 'calc(100vh - 60px)', background: '#0a0a0a', padding: isModal ? '32px 24px 48px' : '60px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {!isModal && <BackLink />}

          {/* Header */}
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 12 }}>
            Legal
          </p>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
            Privacy Policy
          </h1>
          <p style={paraStyle}>
            Last updated: April 2026
          </p>
          <p style={paraStyle}>
            radcliffe.run (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a free community running group based in Radcliffe, Greater Manchester. This policy explains what personal data we collect, why we collect it, and your rights under UK data protection law (UK GDPR and the Data Protection Act 2018).
          </p>
          <p style={paraStyle}>
            If you have any questions, contact us at{' '}
            <a href="mailto:runtogetherradcliffe@gmail.com" style={{ color: '#f5a623', textDecoration: 'none' }}>
              runtogetherradcliffe@gmail.com
            </a>.
          </p>

          {/* 1. Who we are */}
          <p style={sectionHeadStyle}>1. Who we are</p>
          <p style={paraStyle}>
            radcliffe.run is a free community running group based in Radcliffe, Greater Manchester. We are the data controller for the personal data collected through this website.
          </p>

          {/* 2. What we collect */}
          <p style={sectionHeadStyle}>2. What data we collect and why</p>
          <p style={paraStyle}>
            We collect the following categories of data when you register, sign in, or use the site:
          </p>

          <div style={{ border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111' }}>
                  <th style={{ ...tdStyle, color: '#fff', fontWeight: 600, textAlign: 'left' }}>Data</th>
                  <th style={{ ...tdStyle, color: '#fff', fontWeight: 600, textAlign: 'left' }}>Purpose</th>
                  <th style={{ ...tdStyle, color: '#fff', fontWeight: 600, textAlign: 'left' }}>Lawful basis</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Name, email address', 'Identify you as a member, send you your sign-in link', 'Legitimate interests'],
                  ['Mobile number', 'Contact you about runs if needed', 'Legitimate interests'],
                  ['Emergency contact name, phone, relationship', 'Contact someone on your behalf if you are injured on a run', 'Legitimate interests'],
                  ['Health / medical notes', 'Help run leaders support you safely during runs', 'Explicit consent (Article 9)'],
                  ['Email preferences', 'Determine whether to send you club emails', 'Consent'],
                  ['Photo consent', 'Determine whether to include you in group photos shared online', 'Consent'],
                ].map(([data, purpose, basis], i, arr) => (
                  <tr key={i} style={i < arr.length - 1 ? tableRowStyle : {}}>
                    <td style={tdLabelStyle}>{data}</td>
                    <td style={tdStyle}>{purpose}</td>
                    <td style={{ ...tdStyle, color: basis === 'Explicit consent (Article 9)' ? '#f5a623' : '#aaa' }}>{basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={paraStyle}>
            <strong style={{ color: '#ccc' }}>Health information</strong> is classed as special category data under Article 9 of the UK GDPR. We only store it if you explicitly consent during registration, and it is used solely for runner safety. You can leave this field blank.
          </p>

          {/* 3. Emergency contacts */}
          <p style={sectionHeadStyle}>3. Emergency contact data</p>
          <p style={paraStyle}>
            When you register, you provide the name and phone number of an emergency contact. This person&rsquo;s details are held in our database and are only accessible to verified run leaders — never used for marketing, and never shared with third parties.
          </p>
          <p style={paraStyle}>
            We hold this data on the basis of legitimate interests: the safety benefit of being able to contact a next of kin in an emergency clearly outweighs any privacy impact given the limited access and protective purpose. We recommend you let your emergency contact know their details are held.
          </p>

          {/* 4. Who we share data with */}
          <p style={sectionHeadStyle}>4. Who we share your data with</p>
          <p style={paraStyle}>
            We do not sell or share your data with third parties for marketing. We use the following services to operate the site:
          </p>
          <div style={{ border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111' }}>
                  <th style={{ ...tdStyle, color: '#fff', fontWeight: 600, textAlign: 'left' }}>Service</th>
                  <th style={{ ...tdStyle, color: '#fff', fontWeight: 600, textAlign: 'left' }}>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Supabase', 'Database and authentication — stores all member data on servers in the EU'],
                  ['Resend', 'Email delivery — your email address is passed to Resend when we send you club emails'],
                  ['Vercel', 'Website hosting — processes requests to serve the site'],
                ].map(([service, purpose], i, arr) => (
                  <tr key={i} style={i < arr.length - 1 ? tableRowStyle : {}}>
                    <td style={tdLabelStyle}>{service}</td>
                    <td style={tdStyle}>{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={paraStyle}>
            Emergency contact and health data is also accessible to verified run leaders within the club.
          </p>

          {/* 5. How long we keep your data */}
          <p style={sectionHeadStyle}>5. How long we keep your data</p>
          <div style={{ border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111' }}>
                  <th style={{ ...tdStyle, color: '#fff', fontWeight: 600, textAlign: 'left' }}>Data</th>
                  <th style={{ ...tdStyle, color: '#fff', fontWeight: 600, textAlign: 'left' }}>Retention</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Name, email, mobile', 'Kept while you are an active member. Deleted 1 year after deactivation.'],
                  ['Emergency contact details', 'Deleted immediately when you leave the group or request erasure.'],
                  ['Health / medical notes', 'Deleted immediately when you leave the group or withdraw consent.'],
                  ['Email send logs', 'Retained for up to 1 year for troubleshooting purposes.'],
                ].map(([data, retention], i, arr) => (
                  <tr key={i} style={i < arr.length - 1 ? tableRowStyle : {}}>
                    <td style={tdLabelStyle}>{data}</td>
                    <td style={tdStyle}>{retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 6. Cookies */}
          <p style={sectionHeadStyle}>6. Cookies</p>
          <p style={paraStyle}>
            We use only strictly necessary cookies to keep you signed in. We do not use advertising, tracking, or analytics cookies. No cookie consent banner is required.
          </p>

          {/* 7. Your rights */}
          <p style={sectionHeadStyle}>7. Your rights</p>
          <p style={paraStyle}>
            Under UK GDPR you have the following rights:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            {[
              ['Right to access', 'Request a copy of the data we hold about you.'],
              ['Right to rectification', 'Ask us to correct inaccurate data. You can update most details yourself on your profile page.'],
              ['Right to erasure', 'Ask us to delete your data. We will action this within 30 days.'],
              ['Right to restriction', 'Ask us to limit how we use your data while a dispute is resolved.'],
              ['Right to object', 'Object to processing based on legitimate interests.'],
              ['Right to withdraw consent', 'Where we rely on consent (emails, photos, health data), you can withdraw it at any time — this does not affect the lawfulness of prior processing.'],
            ].map(([right, desc], i, arr) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#ccc', marginBottom: 4 }}>{right}</p>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
          <p style={paraStyle}>
            To exercise any of these rights, email us at{' '}
            <a href="mailto:runtogetherradcliffe@gmail.com" style={{ color: '#f5a623', textDecoration: 'none' }}>
              runtogetherradcliffe@gmail.com
            </a>. We will respond within 30 days.
          </p>
          <p style={paraStyle}>
            You also have the right to lodge a complaint with the Information Commissioner&rsquo;s Office (ICO) at{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: '#f5a623', textDecoration: 'none' }}>
              ico.org.uk
            </a>{' '}
            or by calling 0303 123 1113.
          </p>

          {/* 8. Age */}
          <p style={sectionHeadStyle}>8. Age</p>
          <p style={paraStyle}>
            Radcliffe.run is open to runners aged 18 and over. Young people aged 12–17 may register with parental or guardian consent, with a parent or guardian completing the registration form on their behalf. We do not knowingly collect data from children under 12.
          </p>

          {/* 9. Changes */}
          <p style={sectionHeadStyle}>9. Changes to this policy</p>
          <p style={paraStyle}>
            We may update this policy from time to time. The date at the top of this page shows when it was last revised. Significant changes will be communicated by email to registered members.
          </p>

        </div>
      </main>
      {!isModal && <Footer />}
    </>
  )
}
