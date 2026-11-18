/**
 * C25K cohort sessions as `runs` rows (Nov 2026).
 *
 * Every C25K session is its own run row, `run_type = 'c25k'` (Paul, 12 Nov
 * 2026), so leaders can check runners in against it and nights count towards
 * milestones. The Thursday C25K group is its OWN session, never a group on the
 * regular Thursday run. Nothing else creates these rows: the C25K programme is
 * not in the Google Sheet, so the sheet sync never will.
 *
 * A cohort is 10 weeks from `site_settings.c25k_start_date` (always a Tuesday):
 * a Tuesday session (Aldi, Higher Lane, Whitefield) and a Thursday session
 * (Radcliffe Market) each week, both at the club's 7pm (`start_time` NULL means
 * the club convention, see AGENTS.md), and the graduation run at Heaton Park
 * parkrun on the Saturday of week 10 at 9am.
 *
 * Each row carries a stable key in `google_event_id` ("c25k-<year>:w03:tue"),
 * so creating the sessions again UPDATES them in place: moving the start date
 * within the same year moves every session instead of duplicating it.
 */

export const C25K_WEEKS = 10

export const C25K_TUESDAY_MEETING = 'Aldi, Higher Lane, Whitefield, M45 7EA'
export const C25K_THURSDAY_MEETING = 'Radcliffe Market, Blackburn Street, M26 1PN'
export const C25K_GRADUATION_MEETING = 'Heaton Park parkrun'
export const C25K_GRADUATION_START = '09:00'

export type C25kSlot = 'tue' | 'thu' | 'grad'

export interface C25kSessionRow {
  key: string
  slot: C25kSlot
  week: number
  date: string
  title: string
  meeting_point: string
  start_time: string | null
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** True when `iso` is a real YYYY-MM-DD date that falls on a Tuesday. */
export function isTuesday(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso && d.getUTCDay() === 2
}

/** The cohort's 21 sessions: Tuesday and Thursday for weeks 1-10, then graduation. */
export function buildC25kSessions(startDate: string): C25kSessionRow[] {
  if (!isTuesday(startDate)) {
    throw new Error(`C25K start date must be a Tuesday (YYYY-MM-DD), got "${startDate}"`)
  }
  const cohort = `c25k-${startDate.slice(0, 4)}`
  const rows: C25kSessionRow[] = []
  for (let week = 1; week <= C25K_WEEKS; week++) {
    const w = String(week).padStart(2, '0')
    const tuesday = addDays(startDate, (week - 1) * 7)
    rows.push({
      key: `${cohort}:w${w}:tue`, slot: 'tue', week, date: tuesday,
      title: `C25K week ${week} - Tuesday`, meeting_point: C25K_TUESDAY_MEETING, start_time: null,
    })
    rows.push({
      key: `${cohort}:w${w}:thu`, slot: 'thu', week, date: addDays(tuesday, 2),
      title: `C25K week ${week} - Thursday`, meeting_point: C25K_THURSDAY_MEETING, start_time: null,
    })
  }
  rows.push({
    key: `${cohort}:w${String(C25K_WEEKS).padStart(2, '0')}:grad`, slot: 'grad', week: C25K_WEEKS,
    date: addDays(startDate, (C25K_WEEKS - 1) * 7 + 4),
    title: 'C25K graduation - Heaton Park parkrun', meeting_point: C25K_GRADUATION_MEETING,
    start_time: C25K_GRADUATION_START,
  })
  return rows
}
