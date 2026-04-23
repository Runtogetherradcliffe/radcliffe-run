/* ─────────────────────────────────────────────
   Roundup data types
   Structured to map 1:1 to future Supabase tables
───────────────────────────────────────────── */

export interface ParkrunResult {
  venue: string
  /** e.g. "Muncaster Castle, Cumbria" — shown when not a local venue */
  location?: string
  narrative: string
  /** milestone run number, e.g. 50, 100, 250 */
  milestone?: number
  /** runner achieved a PB */
  pb?: boolean
  /** runner finished 1st in age category, overall, etc. */
  podium?: string
}

export interface RaceResult {
  /** e.g. "RunThrough Lake District" */
  name: string
  /** e.g. "23k", "50k", "10k", "Half Marathon" */
  distance: string
  terrain: 'road' | 'trail' | 'mixed'
  date: string          // ISO date string
  location: string
  narrative: string
  podium?: string       // e.g. "1st F50-54"
}

export interface SocialRun {
  name: string
  date: string
  location: string
  narrative: string
}

export interface RoundupPhoto {
  url: string
  alt: string
  caption?: string
  /** photographer name */
  credit?: string
  /** makes this photo span 2 rows in the grid for visual variety */
  tall?: boolean
}

export interface Roundup {
  id: string
  /** ISO date of the Saturday of that weekend */
  weekendOf: string
  intro?: string
  parkrun: ParkrunResult[]
  races: RaceResult[]
  social?: SocialRun[]
  photos?: RoundupPhoto[]
}

/* ─────────────────────────────────────────────
   Sample data — replace with Supabase fetch
───────────────────────────────────────────── */

export const ROUNDUPS: Roundup[] = [
  {
    id: 'weekend-2025-04-12',
    weekendOf: '2025-04-12',
    intro: 'Another fantastic weekend of running from RTR members across parkruns, trails and roads. Snow, hail and stunning scenery — this lot don\'t do anything by halves.',
    parkrun: [
      {
        venue: 'Clarence',
        location: 'Middlesbrough',
        narrative: 'Stephen Crowe flew the RTR flag at Clarence, putting in a composed run on what\'s become one of his regular Saturday morning haunts.',
      },
      {
        venue: 'Crosby',
        location: 'Sefton',
        narrative: 'Andrew and Alison Whitehead made the trip to Crosby for a breezy coastal parkrun — always a brilliant venue with the iron men looking on.',
      },
      {
        venue: 'Heaton Park',
        narrative: 'A strong turnout at the local favourite. Dale Richards, Mark Taylor, Josh Young, Jane Grantham, Chris Grayshon and Chris all represented RTR across a busy Heaton Park field.',
      },
      {
        venue: 'Muncaster Castle',
        location: 'Cumbria',
        narrative: 'Andrea Booth took on the notoriously hilly Muncaster Castle course — all castle grounds, woodland and stunning Lakeland views. Worth every climb.',
      },
      {
        venue: 'Newborough Forest',
        location: 'Anglesey',
        narrative: 'Michael Aiken had an outstanding run at Newborough Forest, finishing 1st in his age category on a course that winds through ancient pine forest to the coast.',
        podium: '1st age cat',
      },
      {
        venue: 'Peel',
        location: 'Isle of Man',
        narrative: 'Tracy Wroe made the most of a trip to the Isle of Man with a run at Peel parkrun — a lovely flat course along the harbour front.',
      },
      {
        venue: 'Pendle',
        location: 'Lancashire',
        narrative: 'Angela Pradena took on Pendle — always a character-builder with those hills looming over proceedings.',
      },
      {
        venue: 'Sewerby',
        location: 'East Yorkshire',
        narrative: 'Lucie Tighe ran at Sewerby, a lovely clifftop course on the Yorkshire coast with sea views all the way round.',
      },
    ],
    races: [
      {
        name: 'RunThrough Lake District',
        distance: '23k',
        terrain: 'trail',
        date: '2025-04-12',
        location: 'Keswick, Cumbria',
        narrative: 'Julie Smith, Neil Naisbitt, Delphine Bugarel and Clive Koffman tackled the Lake District 23k, taking in the stunning scenery around Derwent Water and through the valleys below the fells — though this year\'s runners had to contend with snow and hail along the way. Incredible effort from all four.',
      },
      {
        name: 'She Ultra',
        distance: '50k',
        terrain: 'trail',
        date: '2025-04-12',
        location: 'Peak District',
        narrative: 'Kath Biddle completed the She Ultra — a 50k trail race through the Peak District. An incredible achievement, especially in the conditions. Massive congratulations, Kath.',
      },
      {
        name: 'Montane Howgills Trail',
        distance: '26k',
        terrain: 'trail',
        date: '2025-04-13',
        location: 'Sedbergh, Cumbria',
        narrative: 'Chris Mihalyi took on the Howgills on Sunday — relentlessly hilly terrain in the Cumbrian hills with no shortage of bogs and beautiful views. Superb running.',
      },
      {
        name: 'Mersey Tunnel 10k',
        distance: '10k',
        terrain: 'road',
        date: '2025-04-13',
        location: 'Liverpool',
        narrative: 'Sarah Wilson ran the iconic Mersey Tunnel 10k — one of the most unusual road races in the country, taking runners through the tunnel under the Mersey. Great result, Sarah.',
      },
    ],
    photos: [
      {
        url: 'https://picsum.photos/seed/rtr1/800/600',
        alt: 'Runners at the Lake District 23k',
        caption: 'Julie, Neil, Delphine and Clive heading into the fells',
        credit: 'RunThrough',
        tall: true,
      },
      {
        url: 'https://picsum.photos/seed/rtr2/800/500',
        alt: 'Kath Biddle at the She Ultra finish',
        caption: 'Kath crossing the line at the She Ultra 50k',
      },
      {
        url: 'https://picsum.photos/seed/rtr3/800/500',
        alt: 'Newborough Forest parkrun',
        caption: 'Michael Aiken at Newborough Forest',
        credit: 'parkrun',
      },
      {
        url: 'https://picsum.photos/seed/rtr4/800/600',
        alt: 'Muncaster Castle course',
        caption: 'The stunning backdrop at Muncaster Castle parkrun',
      },
    ],
  },
  {
    id: 'weekend-2025-04-05',
    weekendOf: '2025-04-05',
    intro: 'Easter weekend and RTR members were out in force — parkruns, roads and a brilliant social run to boot.',
    parkrun: [
      {
        venue: 'Heaton Park',
        narrative: 'A healthy RTR contingent at Heaton Park for the Easter Saturday edition. Great to see so many orange vests out on the course.',
      },
      {
        venue: 'Radcliffe',
        narrative: 'Home turf for several members this week. Always good to see familiar faces on the Radcliffe course.',
      },
    ],
    races: [
      {
        name: 'Manchester Marathon',
        distance: 'Marathon',
        terrain: 'road',
        date: '2025-04-06',
        location: 'Manchester',
        narrative: 'Three RTR members lined up for Manchester Marathon on Easter Sunday — a brilliant day with great conditions and massive crowd support all the way round. Huge congratulations to everyone who ran.',
      },
    ],
    social: [
      {
        name: 'Easter Sunday Social Run',
        date: '2025-04-06',
        location: 'Radcliffe & Clifton',
        narrative: 'A group of around 15 members joined the Easter Sunday social run, taking in the towpath and looping back through Clifton Country Park. Perfect Easter morning — hot cross buns at the end, naturally.',
      },
    ],
  },
]

export function latestRoundup(): Roundup {
  return ROUNDUPS[0]
}

export function formatWeekend(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
