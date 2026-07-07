/**
 * Pure composition of the Thursday push announcement - extracted from
 * /api/cron/send-push so the copy logic is unit-testable (tests/
 * pushAnnouncement.test.ts). No I/O here.
 */

export interface AnnouncementRun {
  title: string | null
  distance_km: number | string | null
  meeting_point: string | null
  on_tour: boolean | null
  cancelled: boolean | null
  has_jeffing: boolean | null
}

export interface Announcement {
  title: string
  body: string
}

/** Distances deduped, shortest first (the site's ordering principle). */
function distanceLabels(runs: AnnouncementRun[]): string[] {
  const nums = runs
    .map(r => (r.distance_km == null ? null : Number(r.distance_km)))
    .filter((d): d is number => d != null && !Number.isNaN(d))
    .sort((a, b) => a - b)
  return [...new Set(nums.map(d => `${Number.isInteger(d) ? d : d.toFixed(1)}k`))]
}

/**
 * Compose the announcement for tonight's active club runs. Returns null when
 * nothing should be sent (no runs, or every run is cancelled - cancellations
 * are the admin's manual send, not the automated cheery one).
 */
export function composeAnnouncement(runs: AnnouncementRun[]): Announcement | null {
  const active = runs.filter(r => !r.cancelled)
  if (active.length === 0) return null

  const first = active[0]
  const groupBits = [...distanceLabels(active), ...(active.some(r => r.has_jeffing) ? ['Jeffing'] : [])].join(
    ' & '
  )
  const where = first.meeting_point || 'Radcliffe Market'
  const title = first.on_tour
    ? `Tonight we're On Tour: ${first.title ?? 'club run'}`
    : `Tonight: ${first.title ?? 'club run'}`
  const body = `${groupBits ? groupBits + ' · ' : ''}7pm · ${where}`
  return { title, body }
}
