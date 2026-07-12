import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import RecognitionClient from './RecognitionClient'
import AdminShell from '@/components/AdminShell'

export const metadata = { title: 'Recognition - radcliffe.run Admin' }

export default async function RecognitionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: awards, error } = await supabaseAdmin()
    .from('awards')
    .select('member_id, kind, rung, achieved_on, notified_at, created_at, members(first_name, last_name, awards_public)')
    .order('achieved_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <main style={{ flex: 1, padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Recognition</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Milestone crossings</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--faint)', marginTop: 6 }}>
            Every rung crossed, both ladders, recent first. Awards with no date were crossed before the site
            existed and are honoured quietly. Admins see everyone here regardless of a member&apos;s public
            sharing preference - that flag only gates what is celebrated in roundups and socials.
          </p>
        </div>

        {error ? (
          <p style={{ color: '#e05252', fontSize: 'var(--text-base)' }}>Failed to load awards: {error.message}</p>
        ) : (
          <RecognitionClient
            awards={(awards ?? []).map((a) => {
              const member = Array.isArray(a.members) ? a.members[0] : a.members
              return {
                memberId: a.member_id,
                name: member ? `${member.first_name} ${member.last_name}` : 'Unknown member',
                awardsPublic: !!member?.awards_public,
                kind: a.kind as 'run' | 'volunteer',
                rung: a.rung,
                achievedOn: a.achieved_on,
                notified: !!a.notified_at,
                createdAt: a.created_at,
              }
            })}
          />
        )}
      </main>
    </AdminShell>
  )
}
