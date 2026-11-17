/**
 * Jeffing runs alongside the 5k group every Thursday (and on tour), never with
 * the 8k. The Thursday sheet has no jeffing column, so the sync sets this on
 * INSERT from the route's distance. It is deliberately NOT in the sync's
 * UPDATE list, so an admin who switches jeffing off for one night keeps that.
 *
 * Why (17 Nov 2026): runs re-created by a sync (after the bad-paste clean-up
 * of 10 Nov) came in with jeffing off, because the sync used to insert false
 * for every row; the old rows had been set by hand.
 */
export function defaultHasJeffing(distanceKm: number | null, noRun: boolean): boolean {
  if (noRun || distanceKm == null) return false
  return Math.round(distanceKm) === 5
}
