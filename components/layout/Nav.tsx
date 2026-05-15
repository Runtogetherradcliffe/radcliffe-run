'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Nav() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [isLeader, setIsLeader] = useState(false)
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [isC25K,   setIsC25K]   = useState(false)

  const ADMIN_EMAILS = ['paul.j.cox@gmail.com', 'pjcox@fastmail.fm', 'runtogetherradcliffe@gmail.com']

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setSignedIn(!!session)
      if (session?.user?.email) {
        setIsAdmin(ADMIN_EMAILS.includes(session.user.email))
        const { data } = await supabase
          .from('members')
          .select('is_run_leader, cohort')
          .eq('email', session.user.email)
          .single()
        setIsLeader(!!data?.is_run_leader)
        setIsC25K(data?.cohort === 'c25k')
      }
    }
    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session)
      if (!session) { setIsLeader(false); setIsAdmin(false); setIsC25K(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [path])

  const active = (href: string) => href === '/' ? path === '/' : path.startsWith(href)

  const links = [
    { href: '/',         label: 'Home'    },
    { href: '/about',    label: 'About'   },
    { href: '/routes',   label: 'Routes'  },
    { href: '/news',     label: 'Roundup' },
    { href: '/contact',  label: 'Contact' },
  ]

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 1000,
        height: 60,
        background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--white)' }}>
            radcliffe.<span style={{ color: 'var(--orange)' }}>run</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ display: 'flex', gap: 28 }}>
            {links.map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontSize: 'var(--text-base)', fontWeight: 500, textDecoration: 'none',
                color: active(href) ? 'var(--white)' : 'var(--faint)',
                transition: 'color 0.2s',
              }}>
                {label}
              </Link>
            ))}
          </div>
          {isC25K && (
            <Link href="/c25k/programme" style={{
              fontSize: 'var(--text-sm)', fontWeight: 500, textDecoration: 'none',
              color: active('/c25k/programme') ? 'var(--orange)' : 'var(--muted)',
            }}>
              My programme
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" style={{
              fontSize: 'var(--text-sm)', fontWeight: 500, textDecoration: 'none',
              color: 'var(--faint)', padding: '6px 14px',
              border: '1px solid var(--border-2)', borderRadius: 8,
            }}>
              Admin
            </Link>
          )}
          {signedIn ? (
            <Link href="/profile" style={{
              fontSize: 'var(--text-sm)', fontWeight: 700, textDecoration: 'none',
              color: '#0a0a0a', background: '#f5a623',
              padding: '8px 18px', borderRadius: 8,
            }}>
              My profile
            </Link>
          ) : (
            <Link href="/join" style={{
              fontSize: 'var(--text-sm)', fontWeight: 700, textDecoration: 'none',
              color: '#0a0a0a', background: '#f5a623',
              padding: '8px 18px', borderRadius: 8,
            }}>
              Join us
            </Link>
          )}
        </div>

        {/* Hamburger */}
        <button
          style={{
            display: isMobile ? 'flex' : 'none',
            alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 8, color: 'var(--white)',
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

      {/* Mobile menu */}
      {isMobile && open && (
        <div style={{
          position: 'fixed', inset: '60px 0 0 0', zIndex: 999,
          background: 'color-mix(in srgb, var(--bg) 98%, transparent)',
          backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 28,
          borderTop: '1px solid var(--border)',
        }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 22, fontWeight: 600,
                color: active(href) ? 'var(--white)' : 'var(--muted)',
                textDecoration: 'none', letterSpacing: '-0.02em',
              }}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}

          {isLeader && (
            <Link
              href="/leader"
              style={{
                fontSize: 22, fontWeight: 600,
                color: active('/leader') ? 'var(--white)' : 'var(--muted)',
                textDecoration: 'none', letterSpacing: '-0.02em',
              }}
              onClick={() => setOpen(false)}
            >
              Emergency contacts
            </Link>
          )}

          {isC25K && (
            <Link
              href="/c25k/programme"
              style={{
                fontSize: 22, fontWeight: 600,
                color: active('/c25k/programme') ? 'var(--orange)' : 'var(--muted)',
                textDecoration: 'none', letterSpacing: '-0.02em',
              }}
              onClick={() => setOpen(false)}
            >
              My programme
            </Link>
          )}

          {/* Primary CTA */}
          {signedIn ? (
            <Link
              href="/profile"
              style={{
                background: '#f5a623', color: '#0a0a0a',
                padding: '12px 32px', borderRadius: 8,
                fontWeight: 700, textDecoration: 'none', fontSize: 18,
              }}
              onClick={() => setOpen(false)}
            >
              My profile
            </Link>
          ) : (
            <>
              <Link
                href="/join"
                style={{
                  background: '#f5a623', color: '#0a0a0a',
                  padding: '12px 32px', borderRadius: 8,
                  fontWeight: 700, textDecoration: 'none', fontSize: 18,
                }}
                onClick={() => setOpen(false)}
              >
                Join us
              </Link>
              <Link
                href="/signin"
                style={{
                  fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--faint)',
                  textDecoration: 'none',
                }}
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            </>
          )}

          {isAdmin && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <Link
                href="/admin"
                style={{ fontSize: 'var(--text-sm)', color: 'var(--faint)', textDecoration: 'none' }}
                onClick={() => setOpen(false)}
              >
                Admin
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  )
}
