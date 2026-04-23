import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import { ROUNDUPS, formatWeekend, type Roundup, type ParkrunResult, type RaceResult, type SocialRun, type RoundupPhoto } from '@/lib/roundup'

export const metadata = {
  title: 'Weekend Roundup — radcliffe.run',
  description: 'RTR members\' weekend running highlights — parkrun results, races and social runs.',
}

/* ── Terrain badge ── */
const TERRAIN: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trail: { label: 'Trail',  color: '#7cb87c', bg: '#0d1a0d', border: '#1a3a1a' },
  road:  { label: 'Road',   color: '#6b9fd4', bg: '#0d1221', border: '#1a2a44' },
  mixed: { label: 'Mixed',  color: '#d4a84b', bg: '#1a1208', border: '#3a2a0a' },
}

function TerrainBadge({ terrain }: { terrain: string }) {
  const t = TERRAIN[terrain] ?? TERRAIN.mixed
  return (
    <span style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}`, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4 }}>
      {t.label}
    </span>
  )
}

/* ── Section heading ── */
function SectionHeading({ emoji, title, count }: { emoji: string; title: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h2>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#555', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: '2px 10px', marginLeft: 2 }}>
        {count}
      </span>
    </div>
  )
}

/* ── Parkrun venue card ── */
function ParkrunCard({ result }: { result: ParkrunResult }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{result.venue} parkrun</p>
          {result.location && (
            <p style={{ fontSize: 12, color: '#555' }}>📍 {result.location}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {result.podium && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f5a623', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', padding: '3px 8px', borderRadius: 4 }}>
              🏆 {result.podium}
            </span>
          )}
          {result.pb && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7cb87c', background: 'rgba(124,184,124,0.1)', border: '1px solid rgba(124,184,124,0.25)', padding: '3px 8px', borderRadius: 4 }}>
              ⚡ PB
            </span>
          )}
          {result.milestone && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#c4a8e8', background: 'rgba(196,168,232,0.1)', border: '1px solid rgba(196,168,232,0.25)', padding: '3px 8px', borderRadius: 4 }}>
              🎉 Run {result.milestone}
            </span>
          )}
        </div>
      </div>
      <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>{result.narrative}</p>
    </div>
  )
}

/* ── Race card ── */
function RaceCard({ result }: { result: RaceResult }) {
  const d = new Date(result.date)
  const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{result.name}</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <TerrainBadge terrain={result.terrain} />
            <span style={{ fontSize: 12, color: '#f5a623', fontWeight: 600 }}>{result.distance}</span>
            <span style={{ fontSize: 12, color: '#555' }}>·</span>
            <span style={{ fontSize: 12, color: '#555' }}>{day}</span>
            <span style={{ fontSize: 12, color: '#555' }}>·</span>
            <span style={{ fontSize: 12, color: '#555' }}>📍 {result.location}</span>
          </div>
        </div>
        {result.podium && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f5a623', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', padding: '3px 8px', borderRadius: 4, flexShrink: 0 }}>
            🏆 {result.podium}
          </span>
        )}
      </div>
      <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>{result.narrative}</p>
    </div>
  )
}

/* ── Social run card ── */
function SocialCard({ result }: { result: SocialRun }) {
  const d = new Date(result.date)
  const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div style={{ background: 'rgba(196,168,232,0.04)', border: '1px solid rgba(196,168,232,0.15)', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
      <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{result.name}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#555' }}>{day}</span>
        <span style={{ fontSize: 12, color: '#555' }}>·</span>
        <span style={{ fontSize: 12, color: '#555' }}>📍 {result.location}</span>
      </div>
      <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>{result.narrative}</p>
    </div>
  )
}

/* ── Full roundup ── */
function RoundupPost({ roundup, featured }: { roundup: Roundup; featured?: boolean }) {
  const satRaces = roundup.races.filter(r => new Date(r.date).getDay() === 6)
  const sunRaces = roundup.races.filter(r => new Date(r.date).getDay() === 0)
  const otherRaces = roundup.races.filter(r => {
    const day = new Date(r.date).getDay()
    return day !== 6 && day !== 0
  })

  return (
    <article>
      {/* Intro */}
      {roundup.intro && (
        <p style={{ fontSize: featured ? 16 : 15, color: '#888', lineHeight: 1.75, marginBottom: 40, maxWidth: 680, borderLeft: '3px solid #1e1e1e', paddingLeft: 16 }}>
          {roundup.intro}
        </p>
      )}

      {/* Parkrun */}
      {roundup.parkrun.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <SectionHeading emoji="🏃" title="parkrun" count={roundup.parkrun.length} />
          {roundup.parkrun.map((r, i) => <ParkrunCard key={i} result={r} />)}
        </section>
      )}

      {/* Social runs */}
      {roundup.social && roundup.social.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <SectionHeading emoji="👟" title="Social runs" count={roundup.social.length} />
          {roundup.social.map((r, i) => <SocialCard key={i} result={r} />)}
        </section>
      )}

      {/* Races */}
      {roundup.races.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <SectionHeading emoji="🏅" title="Races" count={roundup.races.length} />

          {satRaces.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>Saturday</p>
              {satRaces.map((r, i) => <RaceCard key={i} result={r} />)}
            </>
          )}
          {sunRaces.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 12, marginTop: satRaces.length ? 20 : 0 }}>Sunday</p>
              {sunRaces.map((r, i) => <RaceCard key={i} result={r} />)}
            </>
          )}
          {otherRaces.map((r, i) => <RaceCard key={i} result={r} />)}
        </section>
      )}

      {/* Photos */}
      {roundup.photos && roundup.photos.length > 0 && (
        <PhotoGrid photos={roundup.photos} />
      )}
    </article>
  )
}

/* ── Photo grid ── */
function PhotoGrid({ photos }: { photos: RoundupPhoto[] }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHeading emoji="📷" title="Photos" count={photos.length} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: '180px',
        gap: 8,
      }}>
        {photos.map((photo, i) => (
          <div key={i} style={{
            gridRow: photo.tall ? 'span 2' : 'span 1',
            position: 'relative',
            borderRadius: 10,
            overflow: 'hidden',
            background: '#111',
            border: '1px solid #1e1e1e',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.alt}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Caption overlay */}
            {(photo.caption || photo.credit) && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.82))',
                padding: '24px 12px 10px',
              }}>
                {photo.caption && (
                  <p style={{ fontSize: 11, fontWeight: 500, color: '#ddd', lineHeight: 1.4, marginBottom: photo.credit ? 3 : 0 }}>
                    {photo.caption}
                  </p>
                )}
                {photo.credit && (
                  <p style={{ fontSize: 10, color: '#888' }}>📸 {photo.credit}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Archive strip ── */
function Archive({ roundups }: { roundups: Roundup[] }) {
  const archived = roundups.slice(1)
  if (!archived.length) return null
  return (
    <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 40, marginTop: 48 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 20 }}>Previous roundups</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {archived.map(r => {
          const totalResults = r.parkrun.length + r.races.length + (r.social?.length ?? 0)
          return (
            <a key={r.id} href={`/roundup/${r.id}`} className="roundup-archive-link" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px', borderRadius: 10, textDecoration: 'none',
              border: '1px solid transparent', background: 'transparent',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#ccc', marginBottom: 2 }}>
                  Weekend of {formatWeekend(r.weekendOf)}
                </p>
                {r.intro && (
                  <p style={{ fontSize: 12, color: '#444', maxWidth: 480, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.intro}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                <span style={{ fontSize: 12, color: '#555' }}>{totalResults} results</span>
                <span style={{ color: '#333', fontSize: 16 }}>›</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

/* ── Page ── */
export default function RoundupPage() {
  const latest = ROUNDUPS[0]
  const weekend = formatWeekend(latest.weekendOf)
  const photoCount = latest.photos?.length ?? 0
  const totalResults = latest.parkrun.length + latest.races.length + (latest.social?.length ?? 0)

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>Weekend Roundup</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12 }}>
            Weekend of {weekend}
          </h1>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#555' }}>
              {latest.parkrun.length} parkruns · {latest.races.length} races{latest.social?.length ? ` · ${latest.social.length} social` : ''}{photoCount ? ` · ${photoCount} photos` : ''}
            </span>
            <span style={{ fontSize: 13, color: '#333' }}>·</span>
            <span style={{ fontSize: 13, color: '#555' }}>{totalResults} results total</span>
          </div>
        </div>

        {/* Latest roundup */}
        <RoundupPost roundup={latest} featured />

        {/* Archive */}
        <Archive roundups={ROUNDUPS} />

      </main>
      <Footer />
    </>
  )
}
