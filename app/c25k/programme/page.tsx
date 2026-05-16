import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import Nav from '@/components/layout/Nav'
import ProgrammeClient from './ProgrammeClient'
import Link from 'next/link'

export const metadata = {
  title: 'Programme - Couch to 5K - radcliffe.run',
  description: 'Your full week-by-week Couch to 5K session breakdown.',
}

export default async function ProgrammePage() {
  // C25K must be enabled
  const { data: settings } = await supabaseAdmin()
    .from('site_settings')
    .select('c25k_enabled, c25k_session_order, c25k_start_date')
    .single()

  if (!settings?.c25k_enabled) notFound()

  const sessionOrder = (settings.c25k_session_order as Record<string, [number, number, number]> | null) ?? {}
  const startDate    = (settings.c25k_start_date as string | null) ?? null

  // Check auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not signed in
  if (!user) {
    return (
      <>
        <Nav />
        <main style={{
          background: 'var(--bg)', minHeight: 'calc(100vh - 60px)',
          fontFamily: 'Inter, sans-serif', color: 'var(--white)',
          padding: 'clamp(48px, 8vw, 80px) clamp(20px, 5vw, 64px)',
        }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ marginBottom: 32 }}>
              <Link href="/c25k" style={{ fontSize: 'var(--text-sm)', color: '#f5a623', textDecoration: 'none' }}>← Back to Couch to 5K</Link>
            </div>
            <div style={{ fontSize: 40, marginBottom: 20 }}>🔒</div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
              Sign in to view your programme
            </h1>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 300, color: 'var(--dim)', lineHeight: 1.7, margin: '0 0 32px' }}>
              The full session breakdown is only available to registered C25K runners.
              Use the link in your welcome email to sign in, or request a new sign-in link below.
            </p>
            <Link
              href="/signin?next=/c25k/programme"
              style={{
                display: 'inline-block',
                background: '#f5a623', color: '#0a0a0a',
                fontSize: 'var(--text-md)', fontWeight: 700, padding: '13px 28px',
                borderRadius: 10, textDecoration: 'none', letterSpacing: '-0.01em',
              }}
            >
              Sign in →
            </Link>
          </div>
        </main>
      </>
    )
  }

  // Signed in - look up their member record
  const { data: member } = await supabaseAdmin()
    .from('members')
    .select('first_name, c25k_session, cohort, is_run_leader')
    .eq('email', user.email!)
    .eq('status', 'active')
    .maybeSingle()

  const isLeader  = member?.is_run_leader === true
  const isC25K    = member?.cohort === 'c25k'
  const canAccess = isLeader || isC25K

  if (!canAccess) {
    return (
      <>
        <Nav />
        <main style={{
          background: 'var(--bg)', minHeight: 'calc(100vh - 60px)',
          fontFamily: 'Inter, sans-serif', color: 'var(--white)',
          padding: 'clamp(48px, 8vw, 80px) clamp(20px, 5vw, 64px)',
        }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ marginBottom: 32 }}>
              <Link href="/c25k" style={{ fontSize: 'var(--text-sm)', color: '#f5a623', textDecoration: 'none' }}>← Back to Couch to 5K</Link>
            </div>
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--dim)', lineHeight: 1.7 }}>
              This page is for registered Couch to 5K runners. If you think this is a mistake, reply to your welcome email and we&rsquo;ll sort it out.
            </p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Nav />
      <main style={{
        background: 'var(--bg)', minHeight: 'calc(100vh - 60px)',
        fontFamily: 'Inter, sans-serif', color: 'var(--white)',
        padding: 'clamp(48px, 8vw, 80px) clamp(20px, 5vw, 64px)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <ProgrammeClient
            firstName={member!.first_name}
            session={member!.c25k_session ?? null}
            isLeader={isLeader}
            sessionOrder={sessionOrder}
            startDate={startDate}
          />
        </div>
      </main>
    </>
  )
}
