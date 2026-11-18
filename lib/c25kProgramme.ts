/**
 * The C25K programme: the NHS plan as RTR runs it, shared by the members'
 * programme page, the session generator and the emails (Nov 2026).
 *
 * Weeks 6 and 7 have three different runs, and week 5 is RTR's bridge week. Admins choose which falls on
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
    n: 5, title: 'Bridge week',
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
export type WeekOverride = Partial<Record<SlotKey, SlotText>> & { title?: string }
export type WeekOverrides = { [week: string]: WeekOverride }

/** The weeks admins can rewrite: week 5, the bridge before the longer runs (Paul,
 * 18 Nov 2026: the jump from short intervals to 20 minutes is what puts runners
 * off), and weeks 6 and 7. */
export const EDITABLE_WEEKS = [5, 6, 7]
const MAX_LEN = 200
const MAX_TITLE = 80

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
    const title = typeof (week as Record<string, unknown>).title === 'string' ? ((week as Record<string, unknown>).title as string).trim().slice(0, MAX_TITLE) : ''
    if (title) out[String(w)] = { ...(out[String(w)] ?? {}), title }
  }
  return Object.keys(out).length ? out : null
}

/** Keeps only valid orders for weeks 6 and 7: each a permutation of [0, 1, 2]. */
export function sanitizeSessionOrder(input: unknown): SessionOrder | null {
  if (!input || typeof input !== 'object') return null
  const out: SessionOrder = {}
  for (const w of EDITABLE_WEEKS) {
    const arr = (input as Record<string, unknown>)[String(w)]
    if (!Array.isArray(arr) || arr.length !== 3) continue
    const nums = arr.map(Number)
    if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 2) || new Set(nums).size !== 3) continue
    out[String(w)] = nums as [number, number, number]
  }
  return Object.keys(out).length ? out : null
}

/** The programme as members see it: session order applied, then any rewritten runs. */
export function effectiveProgramme(order: SessionOrder | null | undefined, overrides: WeekOverrides | null | undefined): WeekData[] {
  const clean = sanitizeWeekOverrides(overrides) ?? {}
  const safeOrder = sanitizeSessionOrder(order) ?? {}
  return PROGRAMME.map(w => {
    const ordered = w.sessions.length === 3 ? applyOrder(w, safeOrder[String(w.n)]) : w
    const o = clean[String(w.n)]
    if (!o || ordered.sessions.some(s => s.isSpecial)) return ordered
    const titled = o.title ? { ...ordered, title: o.title } : ordered
    // A single-run week (week 5) opens out into Tuesday / Thursday / solo when its runs differ.
    const base = titled.sessions.length === 3
      ? titled.sessions
      : SLOT_LABELS.map(label => ({ ...titled.sessions[0], label }))
    const sessions = base.map((s, i) => {
      const t = o[SLOT_KEYS[i]]
      return t ? { ...s, intervals: t.intervals, totalRun: t.totalRun || s.totalRun } : s
    })
    if (titled.sessions.length === 1 && sessions.every(s => s.intervals === sessions[0].intervals && s.totalRun === sessions[0].totalRun)) {
      return { ...titled, sessions: [{ ...titled.sessions[0], intervals: sessions[0].intervals, totalRun: sessions[0].totalRun }] }
    }
    return { ...titled, sessions }
  })
}

/** The run for one slot of a week: single-run weeks give the same run to every slot. */
export function slotSession(week: WeekData, slot: SlotKey): Session {
  if (week.sessions.length === 1) return week.sessions[0]
  return week.sessions[SLOT_KEYS.indexOf(slot)] ?? week.sessions[0]
}
