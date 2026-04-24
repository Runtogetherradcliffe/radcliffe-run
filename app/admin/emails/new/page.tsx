import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import AdminShell from '@/components/AdminShell'
import EmailComposer from '../EmailComposer'

export const metadata = { title: 'Compose email — radcliffe.run admin' }
export const dynamic = 'force-dynamic'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtRunOption(date: string, runs: { distance_km: number | null }[]) {
  const d = new Date(date + 'T00:00:00')
  const dateStr = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
  const distances = runs.map(r => r.distance_km ? `${r.distance_km}km` : '?').join(' & ')
  return `${dateStr}${distances ? ` — ${distances}` : ''}`
}

export default async function NewEmailPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = supabaseAdmin()

  // Load upcoming Thursday run dates + site settings defaults
  const today = new Date().toISOString().split('T')[0]
  const [{ data: runs }, { data: settings }] = await Promise.all([
    db.from('runs')
      .select('date, distance_km')
      .gte('date', today)
      .neq('run_type', 'social')
      .eq('cancelled', false)
      .order('date', { ascending: true }),
    db.from('site_settings')
      .select('email_default_subject, email_default_opening, email_default_closing')
      .single(),
  ])

  // Group by date for the dropdown
  const dateMap = new Map<string, { distance_km: number | null }[]>()
  for (const r of runs ?? []) {
    if (!dateMap.has(r.date)) dateMap.set(r.date, [])
    dateMap.get(r.date)!.push({ distance_km: r.distance_km })
  }
  const runOptions = Array.from(dateMap.entries()).map(([date, rs]) => ({
    date,
    label: fmtRunOption(date, rs),
  }))

  const blankDraft = {
    thursday_date:    null,
    scheduled_for:    null,
    status:           'draft',
    subject:          settings?.email_default_subject ?? 'This Thursday with RTR 🏃',
    show_opening:     true,
    opening_text:     settings?.email_default_opening ?? '',
    show_route_block: true,
    custom_text:      '',
    show_closing:     true,
    closing_text:     settings?.email_default_closing ?? '',
    recipient_filter: 'all',
  }

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <EmailComposer draft={blankDraft} runOptions={runOptions} isNew={true} />
    </AdminShell>
  )
}
