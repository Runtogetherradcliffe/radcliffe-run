/**
 * RTR run group definitions — single source of truth.
 * Update paces, distances, descriptions here and they apply everywhere.
 */

export interface RunGroup {
  name: string
  distance: string
  style: string
  /** Pace in min/km, or null if no minimum */
  paceKm: string | null
  /** Pace in min/mile, or null if no minimum */
  paceMi: string | null
  desc: string
  color: string
  bg: string
  border: string
}

export const RUN_GROUPS: RunGroup[] = [
  {
    name: 'Get Me Started',
    distance: '5–6k',
    style: 'Jeffing (run/walk)',
    paceKm: null,
    paceMi: null,
    desc: "Perfect if you're new to running or getting back into it after a break. We use jeffing — run/walk intervals — to build fitness at a sustainable pace without overdoing it.",
    color: '#7cb87c',
    bg: '#0d1a0d',
    border: '#1a3a1a',
  },
  {
    name: 'Keep Me Going',
    distance: '5–6k',
    style: 'Continuous running',
    paceKm: '6:15–7:30 /km',
    paceMi: '10–12 min/mi',
    desc: 'Continuous running with regular regroups. A comfortable, social pace with two leaders — one at the front, one at the back.',
    color: '#6b9fd4',
    bg: '#0d1221',
    border: '#1a2a44',
  },
  {
    name: 'Challenge Me',
    distance: '8–10k',
    style: 'Continuous running',
    paceKm: '5:35–6:50 /km',
    paceMi: '9–11 min/mi',
    desc: 'Longer distance for more experienced runners looking to push further. Road and trail routes, with leaders front and back.',
    color: '#f5a623',
    bg: '#1a1000',
    border: '#3a2200',
  },
]
