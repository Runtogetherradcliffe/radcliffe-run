/**
 * The C25K programme: the NHS plan as RTR runs it, shared by the members'
 * programme page, the session generator and the emails (Nov 2026).
 *
 * Weeks 6 and 7 have three different runs. Admins choose which falls on
 * Tuesday, Thursday and the solo slot (`site_settings.c25k_session_order`), and
 * since 18 Nov 2026 can also rewrite those runs in their own words
 * (`site_settings.c25k_week_overrides`, Paul: "editable, not a choice of
 * presets"). `effectiveProgramme` applies both.
 */

export type Session = {
  label: string
  intervals: string
  totalRun: string
  isSpecial?: boolean   // e.g. graduation parkrun
}

export type WeekData = {
  n: number
  title: string
  sessions: Session[]
}

export const PROGRAMME: WeekData[] = [
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

export const SLOT_LABELS = ['Tuesday group', 'Thursday group', 'Solo run'] as const

export type SlotKey = 'tue' | 'thu' | 'solo'
export const SLOT_KEYS: SlotKey[] = ['tue', 'thu', 'solo']
export type SessionOrder = { [week: string]: [number, number, number] }
export type SlotText = { intervals: string; totalRun: string }
export type WeekOverrides = { [week: string]: Partial<Record<SlotKey, SlotText>> }

/** The weeks whose runs admins can rewrite. */
export const EDITABLE_WEEKS = [6, 7]
const MAX_LEN = 200

/** Puts the chosen run on each of Tuesday, Thursday and solo for a 3-run week. */
export function applyOrder(week: WeekData, order: [number, number, number] | undefined): WeekData {
  if (week.sessions.length !== 3 || !order) return week
  const canonical = week.sessions
  // W10's graduation run always stays in the Saturday slot.
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

/** Keeps only well-formed, non-empty text for weeks 6 and 7; anything else is dropped. */
export function sanitizeWeekOverrides(input: unknown): WeekOverrides | null {
  if (!input || typeof input !== 'object') return null
  const out: WeekOverrides = {}
  for (const w of EDITABLE_WEEKS) {
    const week = (input as Record<string, unknown>)[String(w)]
    if (!week || typeof week !== 'object') continue
    for (const k of SLOT_KEYS) {
      const slot = (week as Record<string, unknown>)[k] as Record<string, unknown> | undefined
      if (!slot || typeof slot !== 'object') continue
      const intervals = typeof slot.intervals === 'string' ? slot.intervals.trim().slice(0, MAX_LEN) : ''
      const totalRun = typeof slot.totalRun === 'string' ? slot.totalRun.trim().slice(0, MAX_LEN) : ''
      if (!intervals) continue
      out[String(w)] = { ...(out[String(w)] ?? {}), [k]: { intervals, totalRun } }
    }
  }
  return Object.keys(out).length ? out : null
}

/** The programme as members see it: session order applied, then any rewritten runs. */
export function effectiveProgramme(order: SessionOrder | null | undefined, overrides: WeekOverrides | null | undefined): WeekData[] {
  const clean = sanitizeWeekOverrides(overrides) ?? {}
  return PROGRAMME.map(w => {
    const ordered = w.sessions.length === 3 ? applyOrder(w, order?.[String(w.n)]) : w
    const o = clean[String(w.n)]
    if (!o || ordered.sessions.length !== 3 || ordered.sessions.some(s => s.isSpecial)) return ordered
    return {
      ...ordered,
      sessions: ordered.sessions.map((s, i) => {
        const t = o[SLOT_KEYS[i]]
        return t ? { ...s, intervals: t.intervals, totalRun: t.totalRun || s.totalRun } : s
      }),
    }
  })
}

/** The run for one slot of a week: single-run weeks give the same run to every slot. */
export function slotSession(week: WeekData, slot: SlotKey): Session {
  if (week.sessions.length === 1) return week.sessions[0]
  return week.sessions[SLOT_KEYS.indexOf(slot)] ?? week.sessions[0]
}
