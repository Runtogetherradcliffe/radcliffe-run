'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/members',  label: 'Members' },
  { href: '/admin/runs',     label: 'Runs' },
  { href: '/admin/roundups', label: 'Roundups' },
  { href: '/admin/notify',   label: 'Notifications' },
  { href: '/admin#settings', label: 'Settings' },
]

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname  = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  function isActive(href: string) {
    const path = href.split('#')[0]
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  const navLinks = (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 14px', marginBottom: 8 }}>Menu</p>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isActive(href)
        return (
          <a
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'block', padding: '9px 14px', borderRadius: 8,
              textDecoration: 'none', fontSize: 'var(--text-base)', fontWeight: 500,
              color: active ? '#fff' : '#888',
              background: active ? '#1a1a1a' : 'transparent',
            }}
          >
            {label}
          </a>
        )
      })}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 16, paddingLeft: 0, paddingRight: 0 }}>
        <a
          href="/"
          onClick={() => setMenuOpen(false)}
          style={{ display: 'block', padding: '9px 14px', borderRadius: 8, textDecoration: 'none', color: 'var(--muted)', fontSize: 'var(--text-base)', fontWeight: 500 }}
        >
          View site
        </a>
      </div>
    </nav>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top bar ── */}
      <header style={{
        borderBottom: '1px solid #1e1e1e', padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Hamburger — mobile only */}
          {isMobile && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 6px', color: 'var(--muted)', display: 'flex', alignItems: 'center',
              }}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect y="3"  width="20" height="2" rx="1" fill="currentColor"/>
                <rect y="9"  width="20" height="2" rx="1" fill="currentColor"/>
                <rect y="15" width="20" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
          )}

          <p style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--white)' }}>radcliffe.</span>
            <span style={{ color: '#f5a623' }}>run</span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--faint)', marginLeft: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isMobile && <p style={{ fontSize: 12, color: 'var(--faint)' }}>{userEmail}</p>}
          <a href="/admin/logout" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6 }}>
            Sign out
          </a>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>

        {/* ── Desktop sidebar ── */}
        {!isMobile && (
          <aside style={{ width: 220, borderRight: '1px solid #1e1e1e', padding: '24px 12px', flexShrink: 0 }}>
            {navLinks}
          </aside>
        )}

        {/* ── Mobile: overlay + slide-out drawer ── */}
        {isMobile && menuOpen && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                zIndex: 200,
              }}
            />
            {/* Drawer */}
            <aside style={{
              position: 'fixed', top: 56, left: 0, bottom: 0,
              width: 260, background: 'var(--bg)', borderRight: '1px solid #1e1e1e',
              padding: '24px 12px', zIndex: 201, overflowY: 'auto',
            }}>
              {navLinks}
            </aside>
          </>
        )}

      </div>
    </div>
  )
}
