import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/* ── Sheet URLs ── */
const THURSDAY_SHEET =
  'https://docs.google.com/spreadsheets/d/1ncT1NCbSnFsAokyFBkMWBVsk7yrJTiUfG0iBRxyUCTw/export?format=csv'

const SOCIAL_SHEET =
  'https://docs.google.com/spreadsheets/d/19_174EJY0Vlr4syA7m5RDWzeQb94n15OCHHLMA0uDYo/export?format=csv'

/* ── Thursday sheet columns ── */
const TC = {
  date: 0, r1Name: 2, r1Terrain: 4, r1Distance: 5,
  r2Name: 12, r2Terrain: 14, r2Distance: 15,
  notes: 22, meetingMapUrl: 33,
  r1RtrPage: 34, // AI — "8k RTR page" — maps to r1Name
  r2RtrPage: 35, // AJ — "5k RTR page" — maps to r2Name
}

/* ── Social sheet columns ── */
const SC = {
  date: 0, title: 1, location: 4, routeUrl: 5, distance: 6, notes: 7, cancelled: 8,
}

/* ── Helpers ── */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      row.push(field); field = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      row.push(field); field = ''
      if (row.some(c => c)) rows.push(row)
      row = []
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      field += ch
    }
  }
  if (field || row.length) { row.push(field); if (row.some(c => c)) rows.push(row) }
  return rows
}

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
}

/** Parse flexible date strings → YYYY-MM-DD, or null */
function parseDate(raw: string): string | null {
  raw = raw.trim()

  // Already ISO: "2025-08-21 00:00:00" or "2025-08-21"
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  // "Monday, 6 April 2026" or "Saturday 14 March 2026" or "Sunday 19 July 26"
  const namedMatch = raw.match(/(?:\w+,?\s+)?(\d{1,2})\s+(\w+)\s+(\d{2,4})/)
  if (namedMatch) {
    const day   = namedMatch[1].padStart(2, '0')
    const month = MONTHS[namedMatch[2].toLowerCase()]
    let year    = namedMatch[3]
    if (year.length === 2) year = '20' + year
    if (!month) return null
    return `${year}-${month}-${day}`
  }

  return null
}

function extractMeetingPoint(notes: string): string {
  const m = notes.match(/Meeting:\s*([^|]+)/i)
  return m ? m[1].trim() : 'Radcliffe Market, Blackburn Street, M26 1PN'
}

function extractNotes(notes: string): string | null {
  const cleaned = notes.split('|').map(s => s.trim())
    .filter(s => s && !s.match(/^Meeting:/i)).join(' · ')
  return cleaned || null
}

function extractSlug(url: string): string | null {
  if (!url) return null
  const hash = url.split('#')[1]
  return hash ?? null
}

function normalise(t: string): 'road' | 'trail' | 'mixed' | null {
  const l = t.toLowerCase().trim()
  if (l === 'road')  return 'road'
  if (l === 'trail') return 'trail'
  if (l === 'mixed') return 'mixed'
  return null
}

function parseDistance(s: string): number | null {
  if (!s) return null
  const n = parseFloat(s.replace(/[^\d.]/g, ''))
  return isNaN(n) ? null : n
}

type RunRow = {
  date: string
  title: string
  description: string | null
  terrain: 'road' | 'trail' | 'mixed' | null
  distance_km: number | null
  route_slug: string | null
  meeting_point: string
  meeting_map_url: string | null
  leader_name: null
  cancelled: boolean
  on_tour: boolean
  has_jeffing: boolean
  run_type: string
}

async function fetchCSV(url: string): Promise<string[][]> {
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return parseCSV(await res.text())
}

/* ── Parse Thursday sheet ── */
function parseThursdayRows(rows: string[][]): RunRow[] {
  const out: RunRow[] = []
  for (const row of rows.slice(1)) {
    const date = parseDate(row[TC.date] ?? '')
    if (!date) continue

    const r1Name    = (row[TC.r1Name]     ?? '').trim()
    const r1Terrain = (row[TC.r1Terrain]  ?? '').trim()
    const r1Dist    = (row[TC.r1Distance] ?? '').trim()
    const r2Name    = (row[TC.r2Name]     ?? '').trim()
    const r2Terrain = (row[TC.r2Terrain]  ?? '').trim()
    const r2Dist    = (row[TC.r2Distance] ?? '').trim()
    const notes     = (row[TC.notes]      ?? '').trim()
    const r1Page    = (row[TC.r1RtrPage]  ?? '').trim()
    const r2Page    = (row[TC.r2RtrPage]  ?? '').trim()
    const mapUrl    = (row[TC.meetingMapUrl] ?? '').trim()
    const onTour    = /RTR on tour/i.test(notes)

    if (!r1Name && !r2Name) continue

    const meetingPoint = extractMeetingPoint(notes)
    const notesText    = extractNotes(notes)
    const sharedBase = {
      meeting_point:   meetingPoint,
      meeting_map_url: mapUrl || null,
      leader_name:     null,
      cancelled:       false,
      on_tour:         onTour,
      has_jeffing:     false,
      run_type:        'regular',
      description:     notesText,
    }

    // Route 1 (shorter / primary route)
    if (r1Name) {
      out.push({
        ...sharedBase,
        date,
        title:       r1Name,
        terrain:     normalise(r1Terrain),
        distance_km: parseDistance(r1Dist),
        route_slug:  extractSlug(r1Page),
      })
    }

    // Route 2 (longer route — separate card)
    if (r2Name) {
      out.push({
        ...sharedBase,
        date,
        title:       r2Name,
        terrain:     normalise(r2Terrain),
        distance_km: parseDistance(r2Dist),
        route_slug:  extractSlug(r2Page),
      })
    }
  }
  return out
}

/* ── Parse social sheet ── */
function parseSocialRows(rows: string[][]): RunRow[] {
  const out: RunRow[] = []
  for (const row of rows.slice(1)) {
    const date = parseDate(row[SC.date] ?? '')
    if (!date) continue

    const title     = (row[SC.title]     ?? '').trim()
    const location  = (row[SC.location]  ?? '').trim()
    const routeUrl  = (row[SC.routeUrl]  ?? '').trim()
    const distance  = (row[SC.distance]  ?? '').trim()
    const notes     = (row[SC.notes]     ?? '').trim()
    const cancelled = /^(yes|true|1)/i.test((row[SC.cancelled] ?? '').trim())

    if (!title) continue

    // Include Strava link in description if present
    const parts = [notes, routeUrl ? `Route: ${routeUrl}` : null].filter(Boolean)
    const description = parts.join(' · ') || null

    out.push({
      date,
      title,
      description,
      terrain:         null,
      distance_km:     parseDistance(distance),
      route_slug:      null,
      meeting_point:   location || 'Radcliffe Market, Blackburn Street, M26 1PN',
      meeting_map_url: null,
      leader_name:     null,
      cancelled,
      on_tour:         false,
      has_jeffing:     false,
      run_type:        'social',
    })
  }
  return out
}

/* ── Debug: inspect sheet columns without writing to DB ── */
export async function GET() {
  let thursdayRows: string[][]
  try {
    thursdayRows = await fetchCSV(THURSDAY_SHEET)
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch sheet: ${err}` }, { status: 502 })
  }

  const header = thursdayRows[0] ?? []

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Find upcoming rows (dates >= today) and show first 10
  const upcomingRows = thursdayRows.slice(1).filter(row => {
    const d = parseDate(row[0] ?? '')
    return d && d >= today
  }).slice(0, 10)

  const sheetData = upcomingRows.map((row, i) => ({
    rowIndex: i + 1,
    date:        parseDate(row[0] ?? ''),
    r1Name:      row[2]  ?? '',
    r2Name:      row[12] ?? '',
    r1_slug:     extractSlug(row[34] ?? ''),
    r2_slug:     extractSlug(row[35] ?? ''),
  }))

  // Show ALL upcoming runs exactly as the homepage sees them (limit 10, same query)
  const { data: homepageRows, error: homepageError } = await supabaseAdmin()
    .from('runs')
    .select('id, date, title, route_slug, run_type, cancelled, distance_km')
    .gte('date', today)
    .eq('cancelled', false)
    .order('date', { ascending: true })
    .limit(10)

  return NextResponse.json({
    today,
    sheet: sheetData,
    homepage_query: { rows: homepageRows ?? [], error: homepageError?.message ?? null },
  })
}

/* ── Main handler ── */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Fetch both sheets in parallel
  let thursdayRows: string[][], socialRows: string[][]
  try {
    ;[thursdayRows, socialRows] = await Promise.all([
      fetchCSV(THURSDAY_SHEET),
      fetchCSV(SOCIAL_SHEET),
    ])
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch sheets: ${err}` }, { status: 502 })
  }

  const today  = new Date(); today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today); cutoff.setFullYear(cutoff.getFullYear() + 1)

  const allRuns: RunRow[] = [
    ...parseThursdayRows(thursdayRows),
    ...parseSocialRows(socialRows),
  ].filter(r => {
    const d = new Date(r.date + 'T00:00:00')
    return d >= today && d <= cutoff
  })

  if (allRuns.length === 0) {
    return NextResponse.json({ inserted: 0, updated: 0, errors: 0, message: 'No upcoming runs found' })
  }

  // Fetch existing runs in range — keyed on (date, title) so multiple runs per date work
  const dates = [...new Set(allRuns.map(r => r.date))]
  const { data: existing } = await supabaseAdmin()
    .from('runs')
    .select('id, date, title, cancelled, has_jeffing')
    .in('date', dates)

  // Key: "date::title" — but same title can appear twice on a date (e.g. both groups run
  // the same route). Store an array per key so we can pop one row per matching run.
  const existingArrayMap = new Map<string, { id: string; date: string; title: string; cancelled: boolean; has_jeffing: boolean }[]>()
  for (const r of existing ?? []) {
    const key = `${r.date}::${r.title}`
    if (!existingArrayMap.has(key)) existingArrayMap.set(key, [])
    existingArrayMap.get(key)!.push(r)
  }

  let inserted = 0, updated = 0, errors = 0

  for (const run of allRuns) {
    const key = `${run.date}::${run.title}`
    const candidates = existingArrayMap.get(key) ?? []
    const ex = candidates.shift() // consume one match; leaves the other for same-title sibling
    if (ex) {
      const { error } = await supabaseAdmin()
        .from('runs')
        .update({
          description:     run.description,
          terrain:         run.terrain,
          distance_km:     run.distance_km,
          meeting_point:   run.meeting_point,
          meeting_map_url: run.meeting_map_url,
          on_tour:         run.on_tour,
          run_type:        run.run_type,
          // Only overwrite route_slug if the sheet actually provides one —
          // manual overrides set in admin survive syncs when the sheet is empty
          ...(run.route_slug ? { route_slug: run.route_slug } : {}),
          // Never overwrite: cancelled, has_jeffing — manual overrides in admin always win
        })
        .eq('id', ex.id)
      error ? errors++ : updated++
    } else {
      const { error } = await supabaseAdmin().from('runs').insert(run)
      error ? errors++ : inserted++
    }
  }

  return NextResponse.json({ inserted, updated, errors, total: allRuns.length })
}
