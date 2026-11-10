/**
 * "No run" weeks (Nov 2026). The Thursday sheet marks a planned week off
 * (Christmas Eve, New Year's Eve) by naming the routes "No run". The sync
 * stores those rows as cancelled, every time it runs, so nothing treats them
 * as a run: no push announcement, no check-in, no email route block, and they
 * never count towards attendance. The site shows the week as "No run this
 * Thursday" instead of hiding it, and the native app greys the night out as
 * cancelled.
 *
 * A run cancelled by hand (bad weather, say) is a different thing: it has a
 * real route name, so these helpers return false and the site keeps its
 * existing behaviour for it.
 */

/** True when a sheet route name means "no run this week". */
export function isNoRunTitle(title: string | null | undefined): boolean {
  return /^\s*no\s+run\b/i.test(title ?? '')
}

/** A stored run that is a planned week off rather than a run. */
export function isNoRunNight(run: { title: string | null; cancelled: boolean | null }): boolean {
  return !!run.cancelled && isNoRunTitle(run.title)
}

/**
 * Whether the sync should change a run's `cancelled` flag, and to what.
 * A "No run" row is always cancelled. A row that USED to be "No run" and now
 * has a real route is un-cancelled. Anything else is left alone, so a run an
 * admin cancelled by hand stays cancelled through every sync.
 */
export function syncCancelledUpdate(newTitle: string, previousTitle: string | null): { cancelled: boolean } | Record<string, never> {
  if (isNoRunTitle(newTitle)) return { cancelled: true }
  if (isNoRunTitle(previousTitle)) return { cancelled: false }
  return {}
}
