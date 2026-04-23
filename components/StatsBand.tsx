'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function StatsBand() {
  const [isMobile, setIsMobile] = useState(false)
  const [memberCount, setMemberCount] = useState<string>('…')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    supabase
      .rpc('get_member_count')
      .then(({ data }) => {
        if (data !== null) setMemberCount(String(data))
      })
  }, [])

  const STATS = [
    { num: memberCount, desktop: 'Registered runners', mobile: 'registered' },
    { num: '30–40',     desktop: 'Out every Thursday', mobile: 'per week'   },
    { num: '40+',       desktop: 'Mapped routes',      mobile: 'routes'     },
    { num: 'Free',      desktop: 'Always, forever',    mobile: 'always'     },
  ]

  if (isMobile) {
    return (
      <div style={{ background: '#f5a623', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          {STATS.map(({ num, mobile }) => (
            <div key={mobile} style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.03em', lineHeight: 1 }}>{num}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.55)' }}>{mobile}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f5a623' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>
        {STATS.map(({ num, desktop }) => (
          <div key={desktop} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.04em', lineHeight: 1 }}>{num}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.5)', marginTop: 6 }}>{desktop}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
