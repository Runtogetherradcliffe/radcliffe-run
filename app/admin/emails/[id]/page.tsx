import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import AdminShell from '@/components/AdminShell'
import EmailComposer from '../EmailComposer'

export const metadata = { title: 'Edit email — radcliffe.run admin' }
export const dynamic = 'force-dynamic'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtRunOption(date: string, runs: { distance_km: number | null }[]) {
  const d = new Date(date + 'T00:00:00')
  const dateStr = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
  const distances = runs.map(r => r.distance_km ? `${r.distance_km}km` : '?').join(' & ')
  return `${dateStr}${distances ? ` — ${distances}` : ''}`
}

export default async function EditEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params
  const db = supabaseAdmin()

  const today = new Date().toISOString().split('T')[0]
  const [{ data: email }, { data: runs }] = await Promise.all([
    db.from('scheduled_emails').select('*').eq('id', id).single(),
    db.from('runs')
      .select('date, distance_km')
      .gte('date', today)
      .neq('run_type', 'social')
      .eq('cancelled', false)
      .order('date', { ascending: true }),
  ])

  if (!email) notFound()

  // Also include the thursday_date of this email even if it's in the past
  const pastRuns: typeof runs = []
  if (email.thursday_date && email.thursday_date < today) {
    const { data: past } = await db
      .from('runs')
      .select('date, distance_km')
      .eq('date', email.thursday_date)
    if (past) pastRuns.push(...past)
  }

  const allRunRows = [...(pastRuns ?? []), ...(runs ?? [])]
  const dateMap = new Map<string, { distance_km: number | null }[]>()
  for (const r of allRunRows) {
    if (!dateMap.has(r.date)) dateMap.set(r.date, [])
    dateMap.get(r.date)!.push({ distance_km: r.distance_km })
  }
  const runOptions = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rs]) => ({ date, label: fmtRunOption(date, rs) }))

  const draft = {
    id:               email.id,
    thursday_date:    email.thursday_date,
    scheduled_for:    email.scheduled_for,
    status:           email.status,
    subject:          email.subject ?? '',
    show_opening:     email.show_opening ?? true,
    opening_text:     email.opening_text ?? '',
    show_route_block: email.show_route_block ?? true,
    custom_text:      email.custom_text ?? '',
    show_closing:     email.show_closing ?? true,
    closing_text:     email.closing_text ?? '',
    recipient_filter: email.recipient_filter ?? 'all',
    recipient_count:  email.recipient_count,
    sent_at:          email.sent_at,
  }

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <EmailComposer draft={draft} runOptions={runOptions} isNew={false} />
    </AdminShell>
  )
}
