import { NextRequest, NextResponse } from 'next/server'
import { requireLeader } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/leader/checkin
 * One-tap attendance record: { run_id, member_id, present, group_key? }.
 * present=true upserts (UNIQUE(run_id, member_id) makes re-taps and
 * offline-queue replays idempotent - a double tap cannot double-count);
 * present=false removes the record (mis-tap correction).
 * Auth: run leaders only, cookie or Bearer; recorded_by = the tapping
 * leader's member id.
 *
 * Volunteer credit (10 Jul 2026): checking in a member who is a run leader
 * also records a run_leadership row for the night - leading implies
 * attending, and with several leaders per run it is not practical to record
 * who held which role. The rare "ran but didn't lead" night is an override:
 * delete that night's run_leadership row (unchecking removes both).
 *
 * Deletion audit (register integrity, Jul 2026). present=false hard-deletes the
 * attendance row (and any run_leadership row) via the FK cascade, which left the
 * 16 Jul 2026 phantom uncheck untraceable once edge logs aged past 24h. Each
 * uncheck now writes an append-only attendance_deletions row (deleted_by = the
 * tapping leader) BEFORE deleting, so "who removed this attendee?" stays
 * answerable indefinitely. A no-op uncheck (no attendance row) writes nothing.
 * The audit insert is fail-closed: if it errors we do NOT proceed to an
 * untraceable delete.
 *
 * NO server-side confirm requirement for unchecks (decided, do not relitigate):
 * a confirm-flag-for-old-rows guard would break every deployed app bundle until
 * an OTA landed, and the server cannot distinguish a phantom tap from a
 * legitimate correction anyway. The guard is app-side UX (the undo toast,
 * native-apps 3ce3149); the server's contribution is this audit trail.
 *
 * The response stays { ok, present } - deliberately NO `deleted` payload. The
 * one-time spec proposed returning the removed row for an app-side undo toast,
 * but that toast shipped working entirely from LOCAL state (an offline uncheck
 * queues rather than posting, so a response-driven toast would work only when
 * online - when phantom taps matter least). No caller exists or is planned, and
 * attendance_deletions is the durable record for debugging/forensics, so adding
 * it would be dead response surface - the "add it because X will use it, where X
 * doesn't" shape this repo was bitten by twice in the 16 Jul lockdown.
 */
export async function POST(req: NextRequest) {
  const leader = await requireLeader(req)
  if (!leader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { run_id?: string; member_id?: string; present?: boolean; group_key?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { run_id, member_id, present, group_key } = body
  if (!run_id || !member_id || typeof present !== 'boolean') {
    return NextResponse.json({ error: 'run_id, member_id, present required' }, { status: 400 })
  }
  const GROUPS = ['8k', '5k', 'jeff']
  if (group_key != null && !GROUPS.includes(group_key)) {
    return NextResponse.json({ error: 'invalid group_key' }, { status: 400 })
  }

  const db = supabaseAdmin()

  if (!present) {
    // Audit BEFORE deleting (see doc comment). Read the row we are about to
    // remove so the append-only audit captures what vanished; a no-op uncheck
    // (nothing checked in) is not interesting, so it writes nothing.
    const { data: existing, error: readErr } = await db
      .from('attendance')
      .select('run_id, member_id, group_key, recorded_by, recorded_at')
      .eq('run_id', run_id)
      .eq('member_id', member_id)
      .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

    if (existing) {
      // Was volunteer credit (run_leadership) removed too? Record it, so the
      // audit reflects the full effect of the uncheck.
      const { data: lead, error: leadReadErr } = await db
        .from('run_leadership')
        .select('id')
        .eq('run_id', run_id)
        .eq('member_id', member_id)
        .maybeSingle()
      if (leadReadErr) return NextResponse.json({ error: leadReadErr.message }, { status: 500 })

      // Fail-closed: if we cannot record the audit, do NOT delete untraceably.
      const { error: auditErr } = await db.from('attendance_deletions').insert({
        run_id: existing.run_id,
        member_id: existing.member_id,
        group_key: existing.group_key,
        originally_recorded_by: existing.recorded_by,
        originally_recorded_at: existing.recorded_at,
        had_leadership_row: lead != null,
        deleted_by: leader.memberId,
      })
      if (auditErr) return NextResponse.json({ error: auditErr.message }, { status: 500 })
    }

    const { error } = await db
      .from('attendance')
      .delete()
      .eq('run_id', run_id)
      .eq('member_id', member_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { error: leadErr } = await db
      .from('run_leadership')
      .delete()
      .eq('run_id', run_id)
      .eq('member_id', member_id)
    if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, present: false })
  }

  const { error } = await db.from('attendance').upsert(
    {
      run_id,
      member_id,
      recorded_by: leader.memberId,
      recorded_at: new Date().toISOString(),
      source: 'leader',
      group_key: group_key ?? null,
    },
    { onConflict: 'run_id,member_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: target } = await db
    .from('members')
    .select('is_run_leader')
    .eq('id', member_id)
    .maybeSingle()
  if (target?.is_run_leader) {
    const { error: leadErr } = await db.from('run_leadership').upsert(
      {
        run_id,
        member_id,
        group_key: group_key ?? null,
        source: 'live',
        recorded_by: leader.memberId,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: 'run_id,member_id' }
    )
    if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, present: true })
}
