'use client'

import { useState, useEffect, useRef } from 'react'
import { RUN_GROUPS } from '@/lib/groups'

type GroupKey = 'jeffing' | 'keepMeGoing' | 'challengeMe'

const GROUP_TEXT: Record<GroupKey, { name: string; desc: string }> = {
  jeffing: {
    name: 'Get Me Started',
    desc: "Perfect if you're new to running or getting back into it after a break. We use jeffing — run/walk intervals — to build fitness at a sustainable pace without overdoing it.",
  },
  keepMeGoing: {
    name: 'Keep Me Going',
    desc: 'Continuous running with regular regroups. A comfortable, social pace with two leaders — one at the front, one at the back.',
  },
  challengeMe: {
    name: 'Challenge Me',
    desc: 'Longer distance for more experienced runners looking to push further. Road and trail routes, with leaders front and back.',
  },
}

const TERRAIN_BADGE: Record<string, React.CSSProperties> = {
  trail: { background: '#0d1a0d', color: '#7cb87c', border: '1px solid #1a3a1a' },
  road:  { background: '#0d1221', color: '#6b9fd4', border: '1px solid #1a2a44' },
}

interface Props {
  group: '5K' | '8K' | null
  hasJeffing: boolean
  groupColor: string | null
  terrain: string | null
  onTour: boolean
  accentColor: string
}

function InfoBadge({
  label,
  groupKey,
  active,
  onToggle,
  style,
  activeColor,
}: {
  label: string
  groupKey: GroupKey
  active: boolean
  onToggle: () => void
  style: React.CSSProperties
  activeColor: string
}) {
  return (
    <button
      onClick={onToggle}
      title={`About ${GROUP_TEXT[groupKey].name}`}
      style={{
        ...style,
        cursor: 'pointer',
        border: 'none',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'opacity 0.15s',
        opacity: active ? 1 : undefined,
        boxShadow: active ? `0 0 0 2px ${activeColor}60` : undefined,
      }}
    >
      {label}
    </button>
  )
}

// Pace values sourced from lib/groups.ts — edit there, not here
const keepMeGoingGroup = RUN_GROUPS.find(g => g.name === 'Keep Me Going')!
const challengeMeGroup  = RUN_GROUPS.find(g => g.name === 'Challenge Me')!
const PACE = {
  keepMeGoing: { km: keepMeGoingGroup.paceKm!, miles: keepMeGoingGroup.paceMi! },
  challengeMe:  { km: challengeMeGroup.paceKm!,  miles: challengeMeGroup.paceMi! },
}

function PaceBadge({ paceKey, showMiles, onToggle }: {
  paceKey: 'keepMeGoing' | 'challengeMe'
  showMiles: boolean
  onToggle: () => void
}) {
  const label = showMiles ? PACE[paceKey].miles : PACE[paceKey].km
  return (
    <button
      onClick={onToggle}
      title={showMiles ? 'Switch to km' : 'Switch to miles'}
      style={{
        fontSize: 'var(--text-xs)', color: 'var(--muted)', background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)', borderRadius: 5, padding: '3px 9px',
        cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
        transition: 'background 0.15s',
      }}
    >
      {label}
    </button>
  )
}

export default function RunBadges({ group, hasJeffing, groupColor, terrain, onTour, accentColor }: Props) {
  const [active, setActive] = useState<GroupKey | null>(null)
  const [showMiles, setShowMiles] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setActive(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function toggle(key: GroupKey) {
    setActive(prev => (prev === key ? null : key))
  }

  // Derive card colour from the same source as the badge that was clicked
  const cardColor = active === 'jeffing' ? accentColor
                  : active ? (groupColor ?? accentColor)
                  : null

  const info = active
    ? { ...GROUP_TEXT[active], color: cardColor! }
    : null

  return (
    <div ref={wrapRef}>
      {/* Badge row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>

        {/* Distance */}
        {group === '5K' && groupColor && (
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: groupColor, background: `${groupColor}18`, border: `1px solid ${groupColor}40`, borderRadius: 5, padding: '3px 9px' }}>
            5–6k
          </span>
        )}
        {group === '8K' && groupColor && (
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: groupColor, background: `${groupColor}18`, border: `1px solid ${groupColor}40`, borderRadius: 5, padding: '3px 9px' }}>
            8–10k
          </span>
        )}

        {/* Terrain */}
        {terrain && (
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, ...(TERRAIN_BADGE[terrain] ?? {}) }}>
            {terrain}
          </span>
        )}

        {/* Style + pace — interactive */}
        {hasJeffing ? (
          <>
            <InfoBadge
              label="Jeffing (run/walk)"
              groupKey="jeffing"
              active={active === 'jeffing'}
              onToggle={() => toggle('jeffing')}
              activeColor={accentColor}
              style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#f5a623', background: active === 'jeffing' ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 5, padding: '3px 9px' }}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 9px' }}>
              No minimum pace
            </span>
            {group === '5K' && groupColor && (
              <>
                <InfoBadge
                  label="Continuous running"
                  groupKey="keepMeGoing"
                  active={active === 'keepMeGoing'}
                  onToggle={() => toggle('keepMeGoing')}
                  activeColor={groupColor}
                  style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: groupColor, background: active === 'keepMeGoing' ? `${groupColor}14` : `${groupColor}08`, border: `1px solid ${groupColor}30`, borderRadius: 5, padding: '3px 9px' }}
                />
                <PaceBadge paceKey="keepMeGoing" showMiles={showMiles} onToggle={() => setShowMiles(m => !m)} />
              </>
            )}
          </>
        ) : group === '5K' && groupColor ? (
          <>
            <InfoBadge
              label="Continuous running"
              groupKey="keepMeGoing"
              active={active === 'keepMeGoing'}
              onToggle={() => toggle('keepMeGoing')}
              activeColor={groupColor!}
              style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: groupColor!, background: active === 'keepMeGoing' ? `${groupColor}14` : `${groupColor}08`, border: `1px solid ${groupColor}30`, borderRadius: 5, padding: '3px 9px' }}
            />
            <PaceBadge paceKey="keepMeGoing" showMiles={showMiles} onToggle={() => setShowMiles(m => !m)} />
          </>
        ) : group === '8K' && groupColor ? (
          <>
            <InfoBadge
              label="Continuous running"
              groupKey="challengeMe"
              active={active === 'challengeMe'}
              onToggle={() => toggle('challengeMe')}
              activeColor={groupColor}
              style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: groupColor, background: active === 'challengeMe' ? `${groupColor}14` : `${groupColor}08`, border: `1px solid ${groupColor}30`, borderRadius: 5, padding: '3px 9px' }}
            />
            <PaceBadge paceKey="challengeMe" showMiles={showMiles} onToggle={() => setShowMiles(m => !m)} />
          </>
        ) : null}

        {/* On tour */}
        {onTour && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: accentColor, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 5, padding: '3px 8px' }}>
            On tour
          </span>
        )}
      </div>

      {/* Inline info card */}
      {info && (
        <div
          style={{
            marginTop: 10,
            background: `${info.color}0f`,
            border: `1px solid ${info.color}35`,
            borderRadius: 10,
            padding: '14px 16px 14px 16px',
            position: 'relative',
            animation: 'fadeSlideIn 0.15s ease',
          }}
        >
          <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }`}</style>
          <button
            onClick={() => setActive(null)}
            aria-label="Close"
            style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 'var(--text-md)', lineHeight: 1, padding: 4, fontFamily: 'inherit' }}
          >
            ✕
          </button>
          <p style={{ fontSize: 12, fontWeight: 700, color: info.color, marginBottom: 6, letterSpacing: '0.02em' }}>
            {info.name}
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10, paddingRight: 20 }}>
            {info.desc}
          </p>
          <a
            href="/about#groups"
            style={{ fontSize: 12, fontWeight: 600, color: info.color, textDecoration: 'none', opacity: 0.85 }}
          >
            More about our groups →
          </a>
        </div>
      )}
    </div>
  )
}
