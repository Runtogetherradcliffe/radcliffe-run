# Native app screen renders (M1 Pencil session, 6 Jul 2026)

Exported from the Pencil design document at `/Users/paulcox/Documents/RTR app`
(the source of truth - edit there, re-export here). Both themes; dark is the
brand default. Tokens are extracted to `apps/rtr/src/ui/tokens.ts` in the
native-apps monorepo.

Missing from this export (present in the .pen file): **run-detail** and
**route-detail**, both themes - their map-image fills break Pencil's
`export_nodes` (the frames screenshot fine in-editor). Their structure:
full-bleed light map area (340px) with back/layers overlay chips (dark scrim
in both themes) and the orange "Track this run" pill, then the body - title,
stat chips row (distance / terrain / elevation), meeting point card with
"Open in Maps" (run detail only), description, GPX + Strava links.

Design notes captured in the .pen file (notes layer):

- Tab bar: 4th Check-in tab for `is_run_leader` members only; everyone else
  sees Runs / Routes / Club. Frosted glass tab bar ships with a solid
  ~90%-opacity fill on Android (the file's only blur treatment).
- Map imagery is LIGHT in both themes (app-only decision): only the light
  webp set is fetched, and the live MapLibre style is a single light tile
  style. Overlay controls on maps keep the dark scrim in both themes.
- Registration finish branches on cohort: C25K joiners get Session Zero
  (First Step award, endowed progress bar, named cohort leader, concrete
  first session + add-to-calendar); everyone else gets Welcome Regular (same
  psychology, no programme furniture, no award).
- App icon: the established PWA mark (R + orange slash on dark). The PWA png
  has baked rounded corners - EAS/App Store needs a square 1024 source with
  no baked corners or alpha; regenerate from master artwork.
