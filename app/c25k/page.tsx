import Nav from '@/components/layout/Nav'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/utils/supabase/server'

export const metadata = {
  title: 'Couch to 5K - radcliffe.run',
  description: 'The NHS Couch to 5K programme with Run Together Radcliffe. 10 weeks, two group sessions a week, and a 5K finish line ahead.',
}

/* ── Programme data ── */
type Week = {
  n: number
  heading: string
  title: string
  desc: string
  duration: string
  runRatio: number
  sessionsVary?: boolean
}

// runRatio for W8-W10 is run_min/(run_min+10) so the warm-up/cool-down walk shows in the bar
const WEEKS: Week[] = [
  { n: 1,  heading: 'W1',  title: 'Ease in',           desc: '60s jog / 90s walk × 8',       duration: '30 min', runRatio: 0.43 },
  { n: 2,  heading: 'W2',  title: 'Build to 90s',       desc: 'Build to 90-second jogs',       duration: '31 min', runRatio: 0.47 },
  { n: 3,  heading: 'W3',  title: 'First 3-min run',    desc: 'First 3-minute run appears',    duration: '28 min', runRatio: 0.60 },
  { n: 4,  heading: 'W4',  title: 'Five-min intervals', desc: '3 + 5 min run intervals',       duration: '36 min', runRatio: 0.74 },
  { n: 5,  heading: 'W5',  title: 'Consolidate',        desc: 'Repeat of week 4 - consolidate before week 6', duration: '36 min', runRatio: 0.74 },
  { n: 6,  heading: 'W6',  title: '20 min milestone!',  desc: 'Build to first 20-min run',     duration: '38 min', runRatio: 0.76, sessionsVary: true },
  { n: 7,  heading: 'W7',  title: 'Stretch to 25 min',  desc: 'Work toward 25 min non-stop',   duration: '42 min', runRatio: 0.87, sessionsVary: true },
  { n: 8,  heading: 'W8',  title: '25 min non-stop',    desc: 'Jog 25 minutes continuously',   duration: '35 min', runRatio: 0.71 },
  { n: 9,  heading: 'W9',  title: 'Nearly there',       desc: '28 minutes non-stop',           duration: '38 min', runRatio: 0.74 },
  { n: 10, heading: 'W10', title: 'You run a 5K!',      desc: '30 minutes - you did it',       duration: '40 min', runRatio: 0.75 },
]

/* ── Week card ── */
function WeekCard({ week }: { week: Week }) {
  const runPct  = Math.round(week.runRatio * 100)
  const walkPct = 100 - runPct

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 16px 16px',
      minWidth: 152, maxWidth: 152, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative',
    }}>
      {week.sessionsVary && (
        <div style={{
          position: 'absolute', top: -9, right: 10,
          background: 'var(--card-hi)', border: '1px solid #333', color: 'var(--dim)',
          fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
          textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99,
        }}>
          varies
        </div>
      )}
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--faint)', margin: 0 }}>
        WEEK {String(week.n).padStart(2, '0')}
      </p>
      <p style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--white)', margin: 0, lineHeight: 1 }}>
        {week.heading}
      </p>
      <div style={{ height: 6, borderRadius: 99, overflow: 'hidden', background: 'var(--border)', display: 'flex' }}>
        <div style={{ width: `${runPct}%`, background: '#f5a623', borderRadius: walkPct > 0 ? '99px 0 0 99px' : 99 }} />
        {walkPct > 0 && (
          <div style={{ width: `${walkPct}%`, background: 'var(--border-2)', borderRadius: '0 99px 99px 0' }} />
        )}
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#f5a623', margin: '0 0 4px' }}>{week.duration}</p>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 300, color: 'var(--dim)', margin: 0, lineHeight: 1.5 }}>{week.desc}</p>
      </div>
    </div>
  )
}

/* ── Stat card ── */
function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '24px 20px', textAlign: 'center',
      flex: 1, minWidth: 140,
    }}>
      <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#f5a623', margin: '0 0 6px' }}>{value}</p>
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--white)', margin: '0 0 4px' }}>{label}</p>
      {sub && <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--muted)', margin: 0 }}>{sub}</p>}
    </div>
  )
}

/* ── Registration status banner ── */
function RegistrationClosed({ startDate, cohortLabel }: { startDate: string | null; cohortLabel: string | null }) {
  const formatted = startDate
    ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border-2)',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>🔒</div>
      <div>
        <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--dim)', margin: '0 0 6px' }}>
          Registration is currently closed
        </p>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          {cohortLabel && `The ${cohortLabel} cohort `}
          {formatted
            ? `${cohortLabel ? 'starts' : 'The next cohort starts'} on ${formatted}. Registration will open closer to that date.`
            : 'We\'re not currently taking registrations. Check back soon or follow us on Facebook for updates.'}
        </p>
      </div>
    </div>
  )
}

/* ── Page ── */
export default async function C25KPage() {
  const { data: settings } = await supabaseAdmin()
    .from('site_settings')
    .select('c25k_enabled, c25k_registration_open, c25k_start_date, c25k_cohort_label')
    .single()

  if (!settings?.c25k_enabled) notFound()

  const registrationOpen = settings.c25k_registration_open ?? false
  const startDate        = settings.c25k_start_date ?? null
  const cohortLabel      = settings.c25k_cohort_label ?? null

  // Check visitor's membership status
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let joinHref = '/join?c25k=true'
  if (user?.email) {
    const { data: member } = await supabaseAdmin()
      .from('members')
      .select('cohort')
      .eq('email', user.email)
      .eq('status', 'active')
      .maybeSingle()
    if (member?.cohort === 'c25k') {
      joinHref = '/c25k/programme'
    } else if (member) {
      joinHref = '/c25k/join'
    }
  }

  const isRegistered = joinHref === '/c25k/programme'

  const formattedStart = startDate
    ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <>
      <Nav />
      <main style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 60px)', fontFamily: 'Inter, sans-serif', color: 'var(--white)' }}>

        {/* ── Hero ── */}
        <section style={{
          padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
          maxWidth: 1100, margin: '0 auto',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)',
            borderRadius: 99, padding: '6px 14px', marginBottom: 28,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5a623' }} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f5a623' }}>
              Couch to 5K
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 800,
            letterSpacing: '-0.04em', lineHeight: 1.05,
            margin: '0 0 24px', maxWidth: 680,
          }}>
            Become a runner.<br />
            In <span style={{ color: '#f5a623' }}>10 weeks.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 300,
            color: 'var(--dim)', lineHeight: 1.7, maxWidth: 540,
            margin: '0 0 12px',
          }}>
            Based on the NHS Couch to 5K programme, with two group sessions a week
            on Tuesdays and Thursdays - plus one session to complete in your own time.
          </p>

          {cohortLabel && formattedStart && (
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: '#f5a623', margin: '0 0 32px' }}>
              {cohortLabel} · Starting {formattedStart}
            </p>
          )}
          {!cohortLabel && formattedStart && (
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: '#f5a623', margin: '0 0 32px' }}>
              Next cohort starts {formattedStart}
            </p>
          )}
          {!formattedStart && <div style={{ marginBottom: 32 }} />}

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: registrationOpen && !isRegistered ? 20 : 0 }}>
            {registrationOpen ? (
              <Link href={joinHref} style={{
                background: '#f5a623', color: '#0a0a0a',
                fontSize: 'var(--text-md)', fontWeight: 700, padding: '14px 28px',
                borderRadius: 10, textDecoration: 'none', letterSpacing: '-0.01em',
              }}>
                {isRegistered ? 'View your programme →' : 'Join programme →'}
              </Link>
            ) : (
              <RegistrationClosed startDate={startDate} cohortLabel={cohortLabel} />
            )}
          </div>

          {/* Register nudge - only shown to unregistered visitors when registration is open */}
          {registrationOpen && !isRegistered && (
            <div style={{
              marginTop: 4, maxWidth: 500,
              background: 'rgba(245,166,35,0.06)',
              border: '1px solid rgba(245,166,35,0.15)', borderRadius: 12, padding: '14px 18px',
            }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: 'var(--dim)', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--dim)' }}>Please register before your first session</strong> - it only takes two minutes and helps us plan numbers.
                At registration you can tell us whether you plan to come on Tuesdays, Thursdays, or both.
              </p>
            </div>
          )}
        </section>

        {/* ── Stats ── */}
        <section style={{ padding: '0 clamp(20px, 5vw, 64px) 64px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <StatCard value="10"    label="weeks"               sub="NHS plan + 1 bonus week" />
            <StatCard value="2"     label="group sessions/week" sub="Tue &amp; Thu evenings with us" />
            <StatCard value="+ 1"   label="solo session/week"   sub="Complete in your own time" />
            <StatCard value="Free"  label="to join"             sub="No kit or experience needed" />
          </div>
        </section>

        {/* ── Programme ── */}
        <section id="programme" style={{ padding: '0 clamp(20px, 5vw, 64px) 80px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>
              The programme
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>
              Week by week
            </h2>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 300, color: 'var(--muted)', margin: 0 }}>
              Based on the NHS Couch to 5K plan, with an extra consolidation week added at week 5.
              Every session starts with a 5-minute warm-up walk and ends with a 5-minute cool-down.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 6, borderRadius: 99, background: '#f5a623' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>Running</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 6, borderRadius: 99, background: 'var(--border-2)' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>Walking</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, width: 'max-content', paddingRight: 4 }}>
              {WEEKS.map(w => <WeekCard key={w.n} week={w} />)}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 8px' }}>
            <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
              * Week 5 is an addition to the standard NHS plan - we repeat Week 4 to consolidate before the longer runs begin.
              Weeks marked <span style={{ fontWeight: 600, color: 'var(--dim)' }}>varies</span> have a different workout for each session.
            </p>
            <a href="/c25k/programme" style={{ fontSize: 12, color: '#f5a623', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {isRegistered ? 'View your full programme →' : 'Registered? View the full session breakdown →'}
            </a>
          </div>
        </section>

        {/* ── How it works ── */}
        <section style={{
          background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          padding: 'clamp(48px, 6vw, 80px) clamp(20px, 5vw, 64px)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>
                How it works
              </p>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
                Simple, supported, and free
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
              {[
                {
                  icon: '📅',
                  title: 'Two group sessions a week',
                  body: 'We meet on Tuesday and Thursday evenings at 7pm. Come to one or both - each session follows the same week\'s programme.',
                },
                {
                  icon: '🏃',
                  title: 'One solo session a week',
                  body: 'The NHS plan is three runs a week. The third is yours to complete in your own time, whenever suits you.',
                },
                {
                  icon: '🤝',
                  title: 'A group around you',
                  body: 'You\'ll run with others doing the same programme. Nobody gets left behind, and there\'s always someone to chat to.',
                },
                {
                  icon: '📱',
                  title: 'Use the NHS app',
                  body: 'Download the free NHS Couch to 5K app for audio coaching and interval timers - it fits perfectly alongside our sessions.',
                },
              ].map(item => (
                <div key={item.title} style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '24px 20px',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{item.title}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: 'var(--dim)', lineHeight: 1.7, margin: 0 }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sessions ── */}
        <section style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 5vw, 64px)', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>
              When and where
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Group sessions
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { day: 'Tuesday',  time: '7:00pm', note: 'Group session', location: 'Aldi, Higher Lane, Whitefield, M45 7EA' },
              { day: 'Thursday', time: '7:00pm', note: 'Group session', location: 'Radcliffe Market, Blackburn Street, M26 1PN' },
            ].map(s => (
              <div key={s.day} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '24px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', margin: 0 }}>{s.note}</p>
                <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>{s.day}</p>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 300, color: 'var(--dim)', margin: 0 }}>{s.time}</p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: 'var(--muted)', margin: 0 }}>{s.location}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{
          background: 'var(--bg)', borderTop: '1px solid var(--border)',
          padding: 'clamp(48px, 6vw, 80px) clamp(20px, 5vw, 64px)',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>
                Questions
              </p>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
                Good to know
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                {
                  q: 'Do I need to be able to run already?',
                  a: 'Not at all. Week 1 starts with 60-second jogs alternating with 90-second walks. If you can walk briskly, you can start.',
                },
                {
                  q: 'What should I wear?',
                  a: 'Comfortable clothes and a pair of trainers. Running shoes are ideal but not essential for the early weeks. Hi-vis or a clip-on light is useful in autumn and winter.',
                },
                {
                  q: 'What if I miss a week or need to repeat one?',
                  a: 'Completely fine - and common. If a week feels tough, do it again. The programme works best at your own pace.',
                },
                {
                  q: 'What happens after the 10 weeks?',
                  a: 'You graduate to the main Thursday group runs! The regular group does 5K and 8K routes and is welcoming to all paces.',
                },
                {
                  q: 'Is there a cost?',
                  a: 'No - running with us is completely free. There are no membership fees or session charges.',
                },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
                  <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '0 0 8px', color: 'var(--white)' }}>{item.q}</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: 'var(--dim)', margin: 0, lineHeight: 1.7 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Register CTA - hidden once registered ── */}
        {!isRegistered && (
          <section style={{
            padding: 'clamp(64px, 8vw, 96px) clamp(20px, 5vw, 64px)',
            maxWidth: 1100, margin: '0 auto', textAlign: 'center',
          }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 20, padding: 'clamp(40px, 5vw, 64px) clamp(24px, 4vw, 48px)',
              maxWidth: 640, margin: '0 auto',
            }}>
              <div style={{ fontSize: 44, marginBottom: 20 }}>🏃</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
                Ready to start?
              </h2>
              <p style={{ fontSize: 'var(--text-md)', fontWeight: 300, color: 'var(--dim)', lineHeight: 1.7, margin: '0 0 32px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                Registration takes about 2 minutes. Let us know which sessions suit you and
                we&rsquo;ll see you on the start line.
              </p>
              {registrationOpen ? (
                <>
                  <Link href={joinHref} style={{
                    display: 'inline-block',
                    background: '#f5a623', color: '#0a0a0a',
                    fontSize: 16, fontWeight: 700, padding: '15px 36px',
                    borderRadius: 12, textDecoration: 'none', letterSpacing: '-0.01em',
                  }}>
                    Join programme →
                  </Link>
                  <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 16 }}>
                    Free to join &middot; No experience needed &middot; All welcome
                  </p>
                </>
              ) : (
                <RegistrationClosed startDate={startDate} cohortLabel={cohortLabel} />
              )}
            </div>
          </section>
        )}

      </main>
    </>
  )
}
