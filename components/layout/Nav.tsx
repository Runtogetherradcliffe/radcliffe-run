'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Nav() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [path])

  const active = (href: string) => href === '/' ? path === '/' : path.startsWith(href)

  const links = [
    { href: '/',        label: 'Home'    },
    { href: '/routes',  label: 'Routes'  },
    { href: '/roundup', label: 'Roundup' },
    { href: '/about',   label: 'About'   },
  ]

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 1000,
        height: 60,
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
            radcliffe.<span style={{ color: '#f5a623' }}>run</span>
          </span>
        </Link>

        {/* Desktop links — hidden on mobile via JS */}
        <div style={{
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center', gap: 28,
        }}>
          <div style={{ display: 'flex', gap: 28 }}>
            {links.map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                color: active(href) ? '#fff' : '#555',
                transition: 'color 0.2s',
              }}>
                {label}
              </Link>
            ))}
          </div>
          <Link href="/admin" style={{
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
            color: '#555', padding: '6px 14px',
            border: '1px solid #222', borderRadius: 8,
          }}>
            Admin
          </Link>
          <Link href="/join" style={{
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
            color: '#0a0a0a', background: '#f5a623',
            padding: '8px 18px', borderRadius: 8,
          }}>
            Join us
          </Link>
        </div>

        {/* Hamburger — visible on mobile via JS */}
        <button
          style={{
            display: isMobile ? 'flex' : 'none',
            alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 8, color: '#fff',
          }}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="3" y1="6"  x2="19" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu overlay — fully state-driven, no CSS dependency */}
      {isMobile && open && (
        <div style={{
          position: 'fixed', inset: '60px 0 0 0', zIndex: 999,
          background: 'rgba(10,10,10,0.98)',
          backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 32,
          borderTop: '1px solid #1e1e1e',
        }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 22, fontWeight: 600,
                color: active(href) ? '#fff' : '#888',
                textDecoration: 'none', letterSpacing: '-0.02em',
                transition: 'color 0.15s',
              }}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/join"
            style={{
              background: '#f5a623', color: '#0a0a0a',
              padding: '12px 32px', borderRadius: 8,
              fontWeight: 700, textDecoration: 'none',
              fontSize: 22,
            }}
            onClick={() => setOpen(false)}
          >
            Join us
          </Link>
        </div>
      )}
    </>
  )
}
