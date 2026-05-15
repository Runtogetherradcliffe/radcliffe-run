import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '48px 32px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
              radcliffe.<span style={{ color: '#f5a623' }}>run</span>
            </div>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--faint)', lineHeight: 1.7 }}>
              Radcliffe&rsquo;s free running group. Open to everyone, every Thursday.
            </p>
          </div>

          {/* Group links */}
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 16 }}>Group</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { href: '/routes',  label: 'Routes' },
                { href: '/news',    label: 'Roundup' },
                { href: '/about',   label: 'About' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{ fontSize: 'var(--text-base)', color: 'var(--faint)', textDecoration: 'none', transition: 'color 0.2s' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Join links */}
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 16 }}>Join</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { href: '/join',           label: 'Register' },
                { href: '/signin',         label: 'Sign in' },
              ].map(({ href, label }) => (
                <Link key={label} href={href} style={{ fontSize: 'var(--text-base)', color: 'var(--faint)', textDecoration: 'none', transition: 'color 0.2s' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
            &copy; {new Date().getFullYear()} radcliffe.run &middot; Free to run, free to join &middot; Radcliffe, Greater Manchester
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/privacy" style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', textDecoration: 'none' }}>Privacy policy</Link>
            <Link href="/admin" style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', textDecoration: 'none' }}>Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
