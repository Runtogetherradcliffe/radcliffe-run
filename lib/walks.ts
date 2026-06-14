/**
 * Community walks - a public-facing resource presenting walk-friendly routes
 * around Radcliffe. Most walks reuse an existing route's GPX (curated from the
 * running library via `routeSlug`); signature walks can have their own GPX.
 *
 * NOTE: the `accessibility` field is an on-the-ground fact. The values below are
 * first drafts inferred from the route and should be verified by someone who
 * knows the paths before this is trusted as a public resource (steps, surface,
 * buggy-friendliness etc.).
 */

export type Difficulty = 'easy' | 'moderate' | 'challenging'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  challenging: 'Challenging',
}

/**
 * A heritage "stop" along a walk - a point with a short note on what was once
 * there, turning the walk into a self-guided heritage trail (pairs with the
 * historic 1888 map). Position is given either as an explicit `at` coordinate
 * or as `fraction` (0..1) along the route, resolved against the GPX at draw time.
 *
 * ALL `blurb` text below is DRAFT, drafted from the historic OS maps and general
 * local history. It MUST be verified for accuracy before this is published.
 */
export interface Stage {
  title: string
  blurb: string
  fraction?: number            // 0..1 position along the route
  at?: [number, number]        // or an explicit point
}

export interface Walk {
  slug: string
  name: string
  file: string                 // gpx in public/gpx
  distance_km: number
  elevation_m: number
  center: [number, number]
  difficulty: Difficulty
  accessibility: string        // DRAFT - needs local verification
  description: string          // walker-friendly
  routeSlug?: string           // the running route this reuses, if any
  timeOverrideMin?: number     // override the auto walking-time estimate
  stages?: Stage[]             // heritage stops - DRAFT content, verify before publishing
}

/**
 * Walking-time estimate: ~4.8 km/h on the flat plus Naismith's rule of roughly
 * one extra minute per 10 m of ascent, rounded to the nearest 5 minutes.
 */
export function walkingTimeMin(distanceKm: number, elevationM: number): number {
  const mins = (distanceKm / 4.8) * 60 + elevationM / 10
  return Math.max(5, Math.round(mins / 5) * 5)
}

export function formatWalkingTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// Shared draft blurbs (verify before publishing). The canal one matches the
// Elton walk's detail (NCR 6 + Irwell Sculpture Trail).
const BLURB_MARKET = 'Radcliffe grew up where the rivers Irwell and Roch meet, on cotton spinning, paper making and coal. The market has long been the heart of the town and the gathering point for these walks.'
const BLURB_CANAL  = 'The Manchester, Bolton and Bury Canal, opened in the early 1800s to carry coal and goods by horse-drawn boat. Long disused, stretches have since been restored as green routes for walkers and wildlife; the towpath also forms part of National Cycle Route 6 and the Irwell Sculpture Trail.'
const BLURB_PARK   = 'Outwood Country Park was created in 1997, when Bury Council reclaimed the site of the former Outwood Colliery and planted some 25,000 trees. Coal was mined here from 1840 until the 1930s; the green valley you walk today is barely a lifetime old.'

export const WALKS: Walk[] = [
  {
    slug: 'elton-reservoir-via-milltown-bridge',
    name: 'Elton Reservoir via Milltown Bridge',
    file: 'trail-8k--elton-reservoir-via-milltown-bridge.gpx',
    routeSlug: 'trail-8k--elton-reservoir-via-milltown-bridge',
    distance_km: 8.8, elevation_m: 83, center: [53.57081, -2.32042],
    difficulty: 'moderate',
    accessibility: 'Mostly level (83m), largely on the canal towpath. The paths around the reservoir are uneven and can be muddy. One fully accessible footbridge crossing.',
    description: 'A gentle walk beside the water north of Radcliffe, threading together the canal, the reservoirs above the town and the River Irwell. From the market it crosses the new Milltown Bridge - a footbridge linking Milltown Street to the east bank - then follows the valley up through Irwell Bank and Worth Fold before looping back on flat, easy ground. Around 9k with water for company almost the whole way.',
    // DRAFT heritage stops - positions are auto-placed along the route; all
    // content needs verifying (facts and placement) before publishing.
    stages: [
      { fraction: 0.0,  title: 'Radcliffe Market', blurb: 'Radcliffe grew up where the rivers Irwell and Roch meet, on cotton spinning, paper making and coal. The market has long been the heart of the town and the gathering point for these walks.' },
      { at: [53.5632, -2.3211], title: 'Milltown Bridge and the River Irwell', blurb: 'The new Milltown Bridge, a fully accessible footbridge from the end of Milltown Street to the east bank, is the one point where this walk meets the River Irwell. Once among the hardest-working rivers anywhere, the Irwell powered the cotton and paper mills that crowded these banks through the nineteenth century.' },
      { at: [53.56597, -2.32492], title: 'Old railway crossing', blurb: 'The 1888 map shows the Lancashire and Yorkshire Railway crossing the canal here, by the junction it labels Radcliffe West Fork. The lines are long gone - switch to the historic view to see how busy this spot once was.' },
      { at: [53.57006, -2.31730], title: 'Manchester, Bolton & Bury Canal', blurb: 'The Manchester, Bolton and Bury Canal runs alongside much of this walk. Opened in the early 1800s to carry coal and goods by horse-drawn boat, it later fell into disuse; stretches have since been restored as green routes for walkers and wildlife. The towpath here also forms part of National Cycle Route 6 and the Irwell Sculpture Trail.' },
      { fraction: 0.62, title: 'Elton Reservoir', blurb: 'Created in the late 1700s to feed the Manchester, Bolton and Bury Canal with water. Today it is a haven for sailing, angling and birdlife on the edge of Radcliffe.' },
    ],
  },
  {
    slug: 'banana-path-loop',
    name: 'Banana Path Loop',
    file: 'road-5k--banana-path-one-loop.gpx',
    routeSlug: 'road-5k--banana-path-one-loop',
    distance_km: 5.1, elevation_m: 47, center: [53.56508, -2.33544],
    difficulty: 'easy',
    accessibility: 'Tarmac path throughout with one gentle climb. Suitable for buggies.',
    description: 'A short loop on the tarmac Banana Path, which follows the embankment of a former railway line between Radcliffe and Ainsworth. One gentle climb, a relaxed stretch along the top and an easy return. A simple, well-surfaced local favourite.',
    stages: [
      { fraction: 0.0, title: 'Radcliffe Market', blurb: BLURB_MARKET },
      { at: [53.56576, -2.32578], title: 'The Banana Path', blurb: 'The smooth, curving tarmac path that gives this walk its name. It follows the embankment of a dismantled railway, which is why it stays so level underfoot.' },
      { at: [53.56735, -2.32958], title: 'The old railway line', blurb: 'This stretch runs along the former tracks of the Lancashire and Yorkshire Railway. Switch to the 1888 map and you can see the line that once ran where you now walk.' },
      { fraction: 0.7, title: 'Old Race Course', blurb: 'The 1888 map marks an Old Race Course here, complete with a pavilion. Radcliffe held its races around the middle of August, though by the time the map was drawn the course had already fallen out of use - switch to the historic view to trace its oval.' },
    ],
  },
  {
    slug: 'outwood-canal-and-banana-path',
    name: 'Outwood, Canal and Banana Path',
    file: 'trail-5k--outwood-canal-banana-path.gpx',
    routeSlug: 'trail-5k--outwood-canal-banana-path',
    distance_km: 4.8, elevation_m: 42, center: [53.55801, -2.33476],
    difficulty: 'easy',
    accessibility: 'Park trails and canal towpath with one modest climb. Mostly solid ground, some unpaved sections that can be muddy after rain.',
    description: 'A compact loop through Outwood Country Park on the Outwood Trail and Irwell Sculpture Trail, past Nickerhole Clough, returning via Cams Lane and the canal towpath. Just under 5k with one modest climb and solid ground throughout - the pick of the Outwood walks for a first visit.',
    stages: [
      { fraction: 0.0, title: 'Radcliffe Market', blurb: BLURB_MARKET },
      { at: [53.55397, -2.33604], title: 'Outwood Country Park and Trail', blurb: 'The Outwood Trail follows the course of a former railway line, once part of the route running on towards Accrington and Colne. Its great viaduct over the Irwell, restored in 1999, still carries walkers and cyclists nearby. The park itself was reclaimed in 1997 from the former Outwood Colliery.' },
      { fraction: 0.75, title: 'Manchester, Bolton & Bury Canal', blurb: BLURB_CANAL },
    ],
  },
  {
    slug: 'outwood-and-king-george-v-lodge',
    name: 'Outwood and King George V Lodge',
    file: 'trail-5k--outwood-ringley-lake.gpx',
    routeSlug: 'trail-5k--outwood-ringley-lake',
    distance_km: 5.1, elevation_m: 62, center: [53.55333, -2.33278],
    difficulty: 'moderate',
    accessibility: 'Park trails with a steady 39m climb, then a descent to the lodge. Uneven in places.',
    description: 'Climbs steadily through Outwood Country Park on the Outwood Trail and Irwell Sculpture Trail before descending to King George V Lodge, a reservoir on the edge of the park. A satisfying short loop with a little climbing to earn the views.',
    stages: [
      { fraction: 0.0, title: 'Radcliffe Market', blurb: BLURB_MARKET },
      { fraction: 0.3, title: 'Outwood Country Park', blurb: BLURB_PARK },
      { at: [53.54866, -2.33877], title: 'Outwood Colliery', blurb: 'The pithead of Outwood Colliery once stood here. Opened in 1840, it employed around 2,000 people at its peak and sent its coal by tramway to barges on the canal. An underground fire forced its closure in 1931, with coal washing continuing until 1956.' },
      { fraction: 0.6, title: 'King George V Lodge', blurb: 'King George V Lodge, a reservoir on the edge of the country park and the turning point of this loop.' },
    ],
  },
  {
    slug: 'outwood-to-scout-camp',
    name: 'Outwood to Scout Camp and Back',
    file: 'trail-5k--outwood-to-scout-camp-and-back.gpx',
    routeSlug: 'trail-5k--outwood-to-scout-camp-and-back',
    distance_km: 5.2, elevation_m: 40, center: [53.55083, -2.33553],
    difficulty: 'easy',
    accessibility: 'Country park trails with gentle gradients and some natural surfaces.',
    description: 'A gentle out-and-back through Outwood Country Park to the Scout Camp, with views across the valley to Ringley Wood, then the same friendly ground home. Easy to shorten - simply turn around whenever suits.',
    stages: [
      { fraction: 0.0,  title: 'Radcliffe Market', blurb: BLURB_MARKET },
      { fraction: 0.35, title: 'Outwood Country Park', blurb: BLURB_PARK },
      { fraction: 0.5,  title: 'View towards Ringley Wood', blurb: 'The far point of this out-and-back, with a view across the valley to Ringley Wood and the old village of Ringley beyond.' },
    ],
  },
  {
    slug: 'outwood-out-and-back',
    name: 'Outwood Out and Back',
    file: 'trail-5k--outwood-oab.gpx',
    routeSlug: 'trail-5k--outwood-oab',
    distance_km: 9.7, elevation_m: 53, center: [53.54472, -2.32944],
    difficulty: 'moderate',
    accessibility: 'Long but very gentle (53m). Woodland trails with some natural surfaces.',
    description: 'A longer, very gentle day out, heading south from Outwood Country Park along the wooded Outwood and Irwell Sculpture Trails, following the Irwell valley down towards Molyneux Brow. The return mirrors the way out, so you can stop and turn back at any point.',
    stages: [
      { fraction: 0.0,  title: 'Radcliffe Market', blurb: BLURB_MARKET },
      { fraction: 0.25, title: 'The Outwood Trail', blurb: 'The Outwood Trail you are walking follows the course of a former railway line, once part of the route running on towards Accrington and Colne. The line closed in 1966, and its level track-bed now makes for easy going underfoot.' },
      { at: [53.53569, -2.32970], title: 'Fat Hurst Wood', blurb: 'Fat Hurst Wood, a pocket of ancient woodland on the valley side, visible from the trail and marked on the historic map. Ancient woods like this have been continuously wooded for centuries and are among our richest habitats for wildlife.' },
      { at: [53.53107, -2.31745], title: 'Molyneux Brow Station', blurb: 'Near here once stood Molyneux Brow Station, a stop on the railway through the Irwell valley. It was swept away when the motorway was driven through.' },
    ],
  },
  {
    slug: 'outwood-and-chapelfield-nature-reserve',
    name: 'Outwood and Chapelfield Nature Reserve',
    file: 'trail-5k--outwood-king-george-v-playing-fields.gpx',
    routeSlug: 'trail-5k--outwood-king-george-v-playing-fields',
    distance_km: 6.0, elevation_m: 86, center: [53.55424, -2.32136],
    difficulty: 'moderate',
    accessibility: 'A 6k loop with an 86m climb on park and nature-reserve trails. Some inclines and uneven sections.',
    description: 'A varied 6k loop climbing from the market through Outwood Country Park via Pilkington Way and Dale Street, then on through Chapelfield Nature Reserve, a quiet pocket of grassland and woodland, before a long and enjoyable descent through Nursery Brow back to town. A bit more climbing, with good views and wildlife to enjoy along the way.',
    stages: [
      { fraction: 0.0,  title: 'Radcliffe Market', blurb: BLURB_MARKET },
      { fraction: 0.3,  title: 'Outwood Country Park', blurb: BLURB_PARK },
      { at: [53.55102, -2.31910], title: 'Chapelfield Nature Reserve', blurb: 'Chapelfield Nature Reserve, a quiet pocket of grassland and woodland on the climb above the town, managed for wildlife.' },
    ],
  },
]
