'use client'

import { useState } from 'react'
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
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  function isActive(href: string) {
    const path = href.split('#')[0]
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  const navLinks = (
    <>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333', padding: '0 14px', marginBottom: 8 }}>Menu</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ href, label }) => {
          const active = isActive(href)
          return (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', padding: '9px 14px', borderRadius: 8,
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                color: active ? '#fff' : '#888',
                background: active ? '#1a1a1a' : 'transparent',
                transition: 'all 0.15s',
              }}
              className={active ? '' : 'admin-nav-link'}
            >
              {label}
            </a>
          )
        })}
      </nav>
      <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 24, paddingTop: 24, padding: '24px 12px 0' }}>
        <a
          href="/"
          onClick={() => setMenuOpen(false)}
          style={{ display: 'block', padding: '9px 14px', borderRadius: 8, textDecoration: 'none', color: '#888', fontSize: 14, fontWeight: 500 }}
          className="admin-nav-link"
        >
          View site
        </a>
      </div>
    </>
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
          {/* Hamburger — mobile only */}
          <button
            className="admin-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', color: '#888',
            }}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect y="3"  width="20" height="2" rx="1" fill="currentColor"/>
              <rect y="9"  width="20" height="2" rx="1" fill="currentColor"/>
              <rect y="15" width="20" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>

          <p style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#fff' }}>radcliffe.</span>
            <span style={{ color: '#f5a623' }}>run</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#555', marginLeft: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <p className="admin-email" style={{ fontSize: 12, color: '#555' }}>{userEmail}</p>
          <a href="/admin/logout" style={{ fontSize: 12, color: '#555', textDecoration: 'none', padding: '6px 12px', border: '1px solid #222', borderRadius: 6 }}>
            Sign out
          </a>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>

        {/* ── Desktop sidebar ── */}
        <aside className="admin-sidebar-desktop" style={{ width: 220, borderRight: '1px solid #1e1e1e', padding: '24px 12px', flexShrink: 0 }}>
          {navLinks}
        </aside>

        {/* ── Mobile slide-out overlay ── */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 200,
            }}
          />
        )}

        {/* ── Mobile drawer ── */}
        <aside
          className="admin-sidebar-mobile"
          style={{
            position: 'fixed', top: 56, left: 0, bottom: 0,
            width: 260, background: '#0a0a0a', borderRight: '1px solid #1e1e1e',
            padding: '24px 12px', zIndex: 201, overflowY: 'auto',
            transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          }}
        >
          {navLinks}
        </aside>

      </div>

      <style>{`
        .admin-nav-link:hover { background: #111; color: #fff; }

        /* Desktop: show static sidebar, hide hamburger and mobile drawer */
        @media (min-width: 768px) {
          .admin-hamburger       { display: none !important; }
          .admin-sidebar-desktop { display: block !important; }
          .admin-sidebar-mobile  { display: none !important; }
        }

        /* Mobile: hide static sidebar, show hamburger */
        @media (max-width: 767px) {
          .admin-hamburger       { display: flex !important; }
          .admin-sidebar-desktop { display: none !important; }
          .admin-sidebar-mobile  { display: block !important; }
          .admin-email           { display: none !important; }
        }
      `}</style>
    </div>
  )
}
