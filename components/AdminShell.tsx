'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, ReactNode } from 'react'

const NAV_ITEMS = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/members',  label: 'Members' },
  { href: '/admin/runs',     label: 'Runs' },
  { href: '/admin/emails',   label: 'Emails' },
  { href: '/admin/posts',    label: 'Posts' },
  { href: '/admin/notify',   label: 'Notifications' },
  { href: '/admin#settings', label: 'Settings' },
]

export default function AdminShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname  = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  function isActive(href: string) {
    const path = href.split('#')[0]
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  const navLinks = (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333', padding: '0 14px', marginBottom: 8 }}>Menu</p>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isActive(href)
        return (
          <a
            key={label}
            href={href}
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'block', padding: '9px 14px', borderRadius: 8,
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              color: active ? '#fff' : '#888',
              background: active ? '#1a1a1a' : 'transparent',
            }}
          >
            {label}
          </a>
        )
      })}
      <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 24, paddingTop: 16 }}>
        <a
          href="/"
          onClick={() => setMenuOpen(false)}
          style={{ display: 'block', padding: '9px 14px', borderRadius: 8, textDecoration: 'none', color: '#888', fontSize: 14, fontWeight: 500 }}
        >
          View site
        </a>
      </div>
    </nav>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top bar ── */}
      <header style={{
        borderBottom: '1px solid #1e1e1e', padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isMobile && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#888', display: 'flex' }}
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect y="3"  width="20" height="2" rx="1" fill="currentColor"/>
                <rect y="9"  width="20" height="2" rx="1" fill="currentColor"/>
                <rect y="15" width="20" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
          )}
          <p style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#fff' }}>radcliffe.</span>
            <span style={{ color: '#f5a623' }}>run</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#555', marginLeft: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isMobile && <p style={{ fontSize: 12, color: '#555' }}>{userEmail}</p>}
          <a href="/admin/logout" style={{ fontSize: 12, color: '#555', textDecoration: 'none', padding: '6px 12px', border: '1px solid #222', borderRadius: 6 }}>
            Sign out
          </a>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside style={{ width: 220, borderRight: '1px solid #1e1e1e', padding: '24px 12px', flexShrink: 0 }}>
            {navLinks}
          </aside>
        )}

        {/* Mobile overlay + drawer */}
        {isMobile && menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
            <aside style={{
              position: 'fixed', top: 56, left: 0, bottom: 0,
              width: 260, background: '#0a0a0a', borderRight: '1px solid #1e1e1e',
              padding: '24px 12px', zIndex: 201, overflowY: 'auto',
            }}>
              {navLinks}
            </aside>
          </>
        )}

        {/* Page content */}
        {children}
      </div>
    </div>
  )
}
