'use client'

import Link from 'next/link'

/* ── Programme data ─────────────────────────────────────────────────────── */

type Session = {
  label: string
  intervals: string
  totalRun: string
  isSpecial?: boolean   // e.g. graduation parkrun
}

type WeekData = {
  n: number
  title: string
  sessions: Session[]
}

const PROGRAMME: WeekData[] = [
  {
    n: 1, title: 'Ease in',
    sessions: [{ label: 'All sessions', intervals: '8 × (60s jog + 90s walk)', totalRun: '8 min running' }],
  },
  {
    n: 2, title: 'Build to 90 seconds',
    sessions: [{ label: 'All sessions', intervals: '6 × (90s jog + 2 min walk)', totalRun: '9 min running' }],
  },
  {
    n: 3, title: 'First 3-minute run',
    sessions: [{ label: 'All sessions', intervals: '2 × (90s jog, 90s walk, 3 min jog, 3 min walk)', totalRun: '9 min running' }],
  },
  {
    n: 4, title: 'Five-minute intervals',
    sessions: [{ label: 'All sessions', intervals: '3 min jog, 90s walk, 5 min jog, 2½ min walk - repeat', totalRun: '16 min running' }],
  },
  {
    n: 5, title: 'Consolidate (repeat of week 4)',
    sessions: [{ label: 'All sessions', intervals: '3 min jog, 90s walk, 5 min jog, 2½ min walk - repeat', totalRun: '16 min running' }],
  },
  {
    n: 6, title: '20-minute milestone',
    sessions: [
      { label: 'Tuesday group',  intervals: '5 min jog, 3 min walk, 5 min jog, 3 min walk, 5 min jog',  totalRun: '15 min running' },
      { label: 'Thursday group', intervals: '8 min jog, 5 min walk, 8 min jog',                          totalRun: '16 min running' },
      { label: 'Solo run',       intervals: '20 min non-stop',                                            totalRun: '20 min running' },
    ],
  },
  {
    n: 7, title: 'Stretch to 25 minutes',
    sessions: [
      { label: 'Tuesday group',  intervals: '5 min jog, 3 min walk, 8 min jog, 3 min walk, 5 min jog',  totalRun: '18 min running' },
      { label: 'Thursday group', intervals: '10 min jog, 3 min walk, 10 min jog',                        totalRun: '20 min running' },
      { label: 'Solo run',       intervals: '25 min non-stop',                                            totalRun: '25 min running' },
    ],
  },
  {
    n: 8, title: '25 minutes non-stop',
    sessions: [{ label: 'All sessions', intervals: '25 min non-stop', totalRun: '25 min running' }],
  },
  {
    n: 9, title: 'Nearly there',
    sessions: [{ label: 'All sessions', intervals: '28 min non-stop', totalRun: '28 min running' }],
  },
  {
    n: 10, title: 'You run a 5K! 🎉',
    sessions: [
      { label: 'Tuesday group',  intervals: '30 min non-stop',                                                    totalRun: '30 min running' },
      { label: 'Thursday group', intervals: '30 min non-stop',                                                    totalRun: '30 min running' },
      { label: 'Graduation run', intervals: '🎓 Group graduation - Heaton Park parkrun', totalRun: '5K',  isSpecial: true },
    ],
  },
]

const SLOT_LABELS = ['Tuesday group', 'Thursday group', 'Solo run']

const SESSION_COLOURS: Record<string, string> = {
  'Tuesday group':  '#4a9eff',
  'Thursday group': '#f5a623',
  'Solo run':       '#4caf76',
  'Graduation run': '#c084fc',
  'All sessions':   '#888',
}

/* ── Date helpers ───────────────────────────────────────────────────────── */

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000)
}

function fmt(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Returns [tuesdayDate, thursdayDate, saturdayDate] for a given week number (1-based)
function weekDates(startDate: string, weekN: number): [Date, Date, Date] {
  const base   = new Date(startDate + 'T00:00:00')
  const offset = (weekN - 1) * 7
  return [
    addDays(base, offset),         // Tuesday
    addDays(base, offset + 2),     // Thursday
    addDays(base, offset + 4),     // Saturday
  ]
}

/* ── Apply session order to varying weeks ───────────────────────────────── */

function applyOrder(week: WeekData, order: [number, number, number] | undefined): WeekData {
  if (week.sessions.length !== 3 || !order) return week
  const canonical = week.sessions
  // W10 graduation run always stays in slot 2 (Saturday), don't remap it
  if (canonical.some(s => s.isSpecial)) return week
  return {
    ...week,
    sessions: [
      { ...canonical[order[0]], label: SLOT_LABELS[0] },
      { ...canonical[order[1]], label: SLOT_LABELS[1] },
      { ...canonical[order[2]], label: SLOT_LABELS[2] },
    ],
  }
}

/* ── Week row ── */
function WeekRow({ week, startDate }: { week: WeekData; startDate: string | null }) {
  const varies = week.sessions.length > 1

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#0a0a0a', background: '#f5a623', padding: '3px 10px', borderRadius: 99,
        }}>
          W{String(week.n).padStart(2, '0')}
        </span>
        <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, letterSpacing: '-0.01em' }}>{week.title}</span>
        {varies && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--dim)', background: 'var(--card-hi)', border: '1px solid #333', padding: '3px 8px', borderRadius: 99,
          }}>
            sessions vary
          </span>
        )}
      </div>

      {/* Sessions */}
      {week.sessions.map((s, i) => {
        let dateDisplay: string | null = null
        if (startDate) {
          const [tue, thu, sat] = weekDates(startDate, week.n)
          if (s.isSpecial) {
            dateDisplay = fmt(sat)
          } else if (s.label === 'All sessions') {
            dateDisplay = `${fmt(tue)} & ${fmt(thu)}`
          } else if (s.label === 'Tuesday group') {
            dateDisplay = fmt(tue)
          } else if (s.label === 'Thursday group') {
            dateDisplay = fmt(thu)
          }
          // Solo run: no fixed date - dateDisplay stays null
        }

        return (
          <div key={s.label} style={{
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 12, padding: '14px 20px',
            borderBottom: i < week.sessions.length - 1 ? '1px solid #161616' : 'none',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.04em', color: SESSION_COLOURS[s.label] ?? '#888' }}>
                  {s.label}
                </span>
                {dateDisplay && (
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--faint)' }}>· {dateDisplay}</span>
                )}
              </div>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: s.isSpecial ? '#c084fc' : 'var(--dim)', lineHeight: 1.5 }}>
                {s.intervals}
              </span>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--muted)', textAlign: 'right', whiteSpace: 'nowrap', paddingTop: 20 }}>
              {s.totalRun}
            </span>
          </div>
        )
      })}

      {/* Warm-up note */}
      <div style={{ padding: '8px 20px 12px', borderTop: '1px solid #161616' }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 300, color: 'var(--muted)', margin: 0 }}>
          {week.n === 10
            ? 'Group sessions: + 5 min warm-up walk · 5 min cool-down walk'
            : '+ 5 min warm-up walk · 5 min cool-down walk'}
        </p>
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */

type Props = {
  firstName: string
  session: string | null
  isLeader: boolean
  sessionOrder: Record<string, [number, number, number]>
  startDate: string | null
}

export default function ProgrammeClient({ firstName, session, isLeader, sessionOrder, startDate }: Props) {
  const sessionLabel = session === 'tuesday'  ? 'Tuesdays'
    : session === 'thursday' ? 'Thursdays'
    : 'Tuesdays and Thursdays'

  const programme = PROGRAMME.map(w =>
    w.sessions.length === 3
      ? applyOrder(w, sessionOrder[w.n.toString()] as [number, number, number] | undefined)
      : w
  )

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <Link href="/c25k" style={{ fontSize: 'var(--text-sm)', color: '#f5a623', textDecoration: 'none' }}>← Back to Couch to 5K</Link>
      </div>

      <div style={{ marginBottom: 48 }}>
        {isLeader ? (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)',
              borderRadius: 99, padding: '5px 12px', marginBottom: 20,
            }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f5a623' }}>
                Run leader view
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 16px' }}>
              Full programme - {firstName}
            </h1>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 300, color: 'var(--dim)', lineHeight: 1.7, margin: 0 }}>
              Leader view of all 10 weeks. Session order for weeks 6 and 7 reflects the admin settings.
              {startDate && ' Dates are shown based on the configured start date.'}
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: '#f5a623', margin: '0 0 16px' }}>Welcome back, {firstName} 👋</p>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 16px' }}>
              Your 10-week programme
            </h1>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 300, color: 'var(--dim)', lineHeight: 1.7, margin: '0 0 8px' }}>
              You&rsquo;re signed up for <strong style={{ color: 'var(--dim)' }}>{sessionLabel}</strong>.
              Every session begins with a 5-minute warm-up walk and ends with a 5-minute cool-down.
            </p>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 300, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Weeks 6 and 7 have a different workout each session - check which one applies to your day that week.
            </p>
          </>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { label: 'Tuesday group',  colour: '#4a9eff' },
          { label: 'Thursday group', colour: '#f5a623' },
          { label: 'Solo run',       colour: '#4caf76' },
          { label: 'Graduation run', colour: '#c084fc' },
        ].map(({ label, colour }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colour }} />
            <span style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 300 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Programme rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {programme.map(w => <WeekRow key={w.n} week={w} startDate={startDate} />)}
      </div>

      <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 300, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--dim)' }}>Can&rsquo;t make a session?</strong>{' '}
          No problem - if you miss a week or need to repeat one, just carry on where you left off. The programme works best at your own pace.
        </p>
      </div>
    </div>
  )
}
