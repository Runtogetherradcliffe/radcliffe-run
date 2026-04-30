import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import FaqAccordion from './FaqAccordion'
import PaceGroups from './PaceGroups'
import { supabaseAdmin } from '@/lib/supabase'

export const metadata = {
  title: 'About — radcliffe.run',
  description: 'Find out about Run Together Radcliffe — who we are, when we meet, and how to get involved.',
}

/* ── Stat card ── */
function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#f5a623', lineHeight: 1, marginBottom: 8 }}>{value}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#ccc', marginBottom: sub ? 4 : 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: '#555' }}>{sub}</p>}
    </div>
  )
}

/* ── Info row ── */
function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #1a1a1a' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, color: '#ccc', lineHeight: 1.5, textDecoration: 'none' }}>{value}</a>
      ) : (
        <p style={{ fontSize: 15, color: '#ccc', lineHeight: 1.5 }}>{value}</p>
      )}
    </div>
  )
}

export default async function AboutPage() {
  const { data: memberCountData } = await supabaseAdmin().rpc('get_member_count')
  const memberCount = memberCountData !== null ? String(memberCountData) : '…'

  return (
    <>
      <Nav />
      <main>

        {/* ── Hero ── */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: '56px 24px 48px', borderBottom: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 12 }}>About us</p>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20, maxWidth: 560 }}>
            Running together<br />since 2022.
          </h1>
          <p style={{ fontSize: 17, color: '#888', lineHeight: 1.8, maxWidth: 620 }}>
            We're a free, friendly running group meeting every Thursday evening in Radcliffe, Greater Manchester. We're part of the England Athletics Run Together programme — open to everyone, no membership fees, no pressure, no minimum pace.
          </p>
        </section>

        {/* ── Stats ── */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--about-stats-cols)', gap: 12 }}>
            <StatCard value="£0" label="Cost to join" sub="Always free" />
            <StatCard value="Thu" label="Every week" sub="7pm sharp" />
            <StatCard value="65+" label="Routes" sub="Road & trail" />
            <StatCard value={memberCount} label="Registered runners" sub="And counting" />
          </div>
        </section>

        {/* ── Two column: About + Quick info ── */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--about-2col)', gap: 'var(--about-2col-gap)', alignItems: 'start' }}>

            {/* Left: About copy */}
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>What to expect</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 15, color: '#888', lineHeight: 1.8 }}>
                  We meet at Radcliffe Market at 7pm every Thursday. Routes go out at 5k and 8k most weeks, so you pick what suits you. Runs are led by qualified run leaders and nobody gets left behind — we regroup at junctions and make sure everyone gets back together.
                </p>
                <p style={{ fontSize: 15, color: '#888', lineHeight: 1.8 }}>
                  The group has a strong trail running side alongside the road runs, and members organise social runs on weekends fairly regularly — longer distances, off-road, and usually finishing somewhere scenic.
                </p>
                <p style={{ fontSize: 15, color: '#888', lineHeight: 1.8 }}>
                  Beyond the running, there's a real community here. Members support each other at parkruns and races across the country — you'll find our runners at everything from local 5ks to mountain ultras.
                </p>
              </div>
            </div>

            {/* Right: Quick info panel */}
            <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 14, padding: '24px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>The essentials</p>
              <div>
                <InfoRow label="When" value="Every Thursday, 7:00pm" />
                <InfoRow label="Where" value="Radcliffe Market, 11 Blackburn Street, M26 1PN" href="https://maps.app.goo.gl/d1FUYuqmNVpsWUs99" />
                <InfoRow label="Cost" value="Free — always" />
                <InfoRow label="Distances" value="5–6k and 8–10k offered most weeks" />
                <InfoRow label="Ability" value="All levels welcome — run/walk to experienced" />
                <InfoRow label="Programme" value="England Athletics Run Together" />
              </div>
            </div>

          </div>
        </section>

        {/* ── Pace groups ── */}
        <section id="groups" style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 48px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>Groups</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Find your group</h2>
          </div>
          <PaceGroups />
        </section>

        {/* ── FAQ ── */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>FAQ</p>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Common questions</h2>
          </div>
          <FaqAccordion />
        </section>

        {/* ── Join CTA ── */}
        <section style={{ background: '#0f0a1e', borderTop: '1px solid #1e1e1e' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a8e8', marginBottom: 16 }}>Ready to run?</p>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Come and join us</h2>
            <p style={{ fontSize: 16, color: '#888', marginBottom: 32, maxWidth: 460, margin: '0 auto 32px' }}>
              Register takes two minutes. Turn up Thursday at 7pm and we'll do the rest.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/join" style={{
                display: 'inline-block', padding: '14px 32px', borderRadius: 8,
                background: '#f5a623', color: '#0a0a0a', fontSize: 15, fontWeight: 700,
                textDecoration: 'none', letterSpacing: '-0.01em',
              }}>
                Register now
              </a>
              <a href="/routes" style={{
                display: 'inline-block', padding: '14px 32px', borderRadius: 8,
                background: 'transparent', color: '#888', fontSize: 15, fontWeight: 600,
                textDecoration: 'none', border: '1px solid #2a2a2a', letterSpacing: '-0.01em',
              }}>
                Explore routes
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
