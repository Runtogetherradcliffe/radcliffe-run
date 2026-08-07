/**
 * Display helpers for `runs.start_time` / `runs.end_time`.
 *
 * NULL start_time is meaningful: it means the club convention applies
 * (Thursday runs and C25K - 7:00pm, meet from 6:45pm), so every helper here
 * returns null rather than inventing a time. Callers keep their own default.
 *
 * `end_time` is a calendar duration, not a finish-time promise, so it is only
 * ever rendered as "back about ...".
 */

/** Postgres `time` comes back as HH:MM:SS; the sheet can also give HH:MM. */
const TIME_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

/** "09:00:00" -> "9:00am", "13:30" -> "1:30pm". Null for anything else. */
export function formatClock(value: string | null | undefined): string | null {
  const m = TIME_RE.exec((value ?? '').trim())
  if (!m) return null

  const hours = Number(m[1])
  const mins = m[2]
  if (hours > 23 || Number(mins) > 59) return null

  const suffix = hours < 12 ? 'am' : 'pm'
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${display}:${mins}${suffix}`
}

/**
 * The long form used on a run's detail page, matching the native app:
 * "Sets off 9:00am - back about 9:30am" (the second half only when the sheet
 * gave an end time). Null when the run has no start time of its own.
 */
export function formatRunTimeLine(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  const from = formatClock(start)
  if (!from) return null

  const to = formatClock(end)
  return to ? `Sets off ${from} - back about ${to}` : `Sets off ${from}`
}
