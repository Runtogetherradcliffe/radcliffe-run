/**
 * Role-matrix access audit.
 *
 * Asserts the TARGET access-control state of the site across four personas
 * (anon, member, run leader, admin) at both enforcement layers:
 *
 *   Layer A - PostgREST/RLS: what each persona can read/write in the database
 *             directly, using the public anon key + their own JWT.
 *   Layer B - API routes: what each persona gets from the Next.js endpoints,
 *             called over HTTP with real session cookies.
 *
 * Written BEFORE the admin-API/RLS hardening. Run against the un-hardened
 * site, the tests tagged [HOLE] are EXPECTED TO FAIL - that is the baseline
 * proving the harness detects the holes. The untagged tests are the
 * legitimate paths (member self-access, leader emergency contacts, admin
 * tooling) and must be green BEFORE and AFTER the hardening. After the
 * hardening, everything must be green.
 *
 * How to run (NOT part of `npm test` / CI - needs credentials and a server):
 *
 *   1. Ensure .env.local points at the DEV Supabase project (it does by
 *      default) and includes SUPABASE_SERVICE_ROLE_KEY.
 *   2. Start the dev server: npm run dev  (localhost:3000)
 *   3. npm run test:access
 *
 * Environment overrides (all optional):
 *   ACCESS_SITE_URL          target server (default http://localhost:3000)
 *   ACCESS_SUPABASE_URL      target Supabase (default from .env.local)
 *   ACCESS_SUPABASE_ANON_KEY / ACCESS_SERVICE_ROLE_KEY
 *   ACCESS_ALLOW_PRODUCTION=1  required to run against the production
 *                              project (the harness creates and deletes
 *                              probe rows; be deliberate about this)
 *
 * Identities: the harness creates/reuses three fixed test identities on the
 * target project (access-test-member@ / access-test-leader@ radcliffe.run,
 * plus the admin email, which must be in ADMIN_EMAILS for the target
 * server). Sessions are minted with the service role via generateLink -
 * no OTP emails are sent. Probe rows are created in setup and removed in
 * teardown; the three identities persist between runs.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const ENABLED = process.env.ACCESS_AUDIT === '1'
const suite = describe.runIf(ENABLED)

const PRODUCTION_REF = 'qpdymxagloeghypntpct'
const MEMBER_EMAIL = 'access-test-member@radcliffe.run'
const LEADER_EMAIL = 'access-test-leader@radcliffe.run'
const ADMIN_EMAIL = process.env.ACCESS_ADMIN_EMAIL ?? 'paul.j.cox@gmail.com'
const VICTIM_EMAIL = 'access-test-victim@radcliffe.run'
const ANON_INSERT_EMAIL = 'access-test-anon-insert@radcliffe.run'
const PROBE_SLUG = 'access-audit--probe'
const PROBE_ENDPOINT = 'https://example.com/access-audit-probe'

function loadEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const raw = readFileSync(path.resolve(__dirname, '../../.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // no .env.local - overrides must supply everything
  }
  return out
}

type Persona = 'anon' | 'member' | 'leader' | 'admin'

suite('access matrix', () => {
  const envFile = loadEnvLocal()
  const SUPABASE_URL = process.env.ACCESS_SUPABASE_URL ?? envFile.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const ANON_KEY = process.env.ACCESS_SUPABASE_ANON_KEY ?? envFile.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const SERVICE_KEY = process.env.ACCESS_SERVICE_ROLE_KEY ?? envFile.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const SITE_URL = process.env.ACCESS_SITE_URL ?? 'http://localhost:3000'

  let svc: SupabaseClient
  const sessions: Partial<Record<Persona, Session>> = {}
  const cookies: Partial<Record<Persona, string>> = {}
  const restClients: Partial<Record<Persona, SupabaseClient>> = {}

  // Fixture ids captured during setup
  let memberRowId = ''
  let leaderRowId = ''
  let victimRowId = ''
  let probeRunId = ''
  let probePostId = ''
  let probeEmailId = ''
  let settingsRowId = ''
  let settingsSubject: string | null = null

  function anonClient(): SupabaseClient {
    return createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  async function mintSession(email: string): Promise<Session> {
    const created = await svc.auth.admin.createUser({ email, email_confirm: true })
    if (created.error && !/already/i.test(created.error.message)) {
      throw new Error(`createUser(${email}): ${created.error.message}`)
    }
    const link = await svc.auth.admin.generateLink({ type: 'magiclink', email })
    if (link.error) throw new Error(`generateLink(${email}): ${link.error.message}`)
    const verifier = anonClient()
    const { data, error } = await verifier.auth.verifyOtp({
      type: 'magiclink',
      token_hash: link.data.properties.hashed_token,
    })
    if (error || !data.session) throw new Error(`verifyOtp(${email}): ${error?.message}`)
    return data.session
  }

  /** Serialise a session into cookies exactly as @supabase/ssr does. */
  async function cookieHeaderFor(session: Session): Promise<string> {
    const jar = new Map<string, string>()
    const ssr = createServerClient(SUPABASE_URL, ANON_KEY, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach((c) => jar.set(c.name, c.value)),
      },
    })
    await ssr.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    return [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  async function restFor(session: Session): Promise<SupabaseClient> {
    const client = anonClient()
    const { error } = await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (error) throw new Error(`setSession: ${error.message}`)
    return client
  }

  function api(persona: Persona, method: string, apiPath: string, init: { json?: unknown; form?: FormData } = {}) {
    const headers: Record<string, string> = {}
    if (persona !== 'anon') headers.cookie = cookies[persona]!
    let body: BodyInit | undefined
    if (init.form) {
      body = init.form
    } else if (init.json !== undefined) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(init.json)
    }
    return fetch(`${SITE_URL}${apiPath}`, { method, headers, body, redirect: 'manual' })
  }

  beforeAll(async () => {
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      throw new Error('Missing Supabase credentials: need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local (or ACCESS_* overrides)')
    }
    if (SUPABASE_URL.includes('test-project')) {
      throw new Error('Refusing to run against the vitest dummy Supabase URL - is .env.local present?')
    }
    if (SUPABASE_URL.includes(PRODUCTION_REF) && process.env.ACCESS_ALLOW_PRODUCTION !== '1') {
      throw new Error('Refusing to run against PRODUCTION Supabase without ACCESS_ALLOW_PRODUCTION=1 (the harness writes probe rows)')
    }

    svc = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Server reachability check up front, so Layer B failures are legible.
    try {
      await fetch(`${SITE_URL}/api/me`)
    } catch {
      throw new Error(`Cannot reach ${SITE_URL} - start the dev server (npm run dev) first`)
    }

    // Test identities (persist between runs; upsert keeps them canonical)
    const identity = (email: string, isLeader: boolean) => ({
      email,
      first_name: 'Access',
      last_name: isLeader ? 'TestLeader' : email === VICTIM_EMAIL ? 'TestVictim' : 'TestMember',
      mobile: '07000000000',
      emergency_name: 'Access Test EC',
      emergency_phone: '07000000001',
      emergency_relationship: 'test',
      consent_data: true,
      health_declaration: true,
      consent_medical: true,
      photo_consent: false,
      email_opt_out: true, // never include test identities in newsletters
      status: 'active',
      is_run_leader: isLeader,
    })

    // Not using upsert/onConflict: the dev members table has no unique
    // constraint on email, so ON CONFLICT is unavailable. Select-then-write.
    const upsert = async (email: string, isLeader: boolean): Promise<string> => {
      const existing = await svc.from('members').select('id').eq('email', email).maybeSingle()
      if (existing.error) throw new Error(`lookup member ${email}: ${existing.error.message}`)
      if (existing.data) {
        const { error } = await svc.from('members').update(identity(email, isLeader)).eq('id', existing.data.id)
        if (error) throw new Error(`update member ${email}: ${error.message}`)
        return existing.data.id
      }
      const { data, error } = await svc.from('members').insert(identity(email, isLeader)).select('id').single()
      if (error) throw new Error(`insert member ${email}: ${error.message}`)
      return data.id
    }

    memberRowId = await upsert(MEMBER_EMAIL, false)
    leaderRowId = await upsert(LEADER_EMAIL, true)
    victimRowId = await upsert(VICTIM_EMAIL, false)

    // Sessions + cookie jars + REST clients
    for (const [persona, email] of [
      ['member', MEMBER_EMAIL],
      ['leader', LEADER_EMAIL],
      ['admin', ADMIN_EMAIL],
    ] as const) {
      const session = await mintSession(email)
      sessions[persona] = session
      cookies[persona] = await cookieHeaderFor(session)
      restClients[persona] = await restFor(session)
    }

    // Probe rows (removed in teardown)
    {
      const { data, error } = await svc
        .from('runs')
        .insert({ date: '2030-01-01', title: 'ACCESS-AUDIT probe run', meeting_point: 'Radcliffe Market' })
        .select('id')
        .single()
      if (error) throw new Error(`probe run: ${error.message}`)
      probeRunId = data.id
    }
    {
      const { data, error } = await svc
        .from('posts')
        .insert({ type: 'news', title: 'ACCESS-AUDIT probe post', status: 'draft' })
        .select('id')
        .single()
      if (error) throw new Error(`probe post: ${error.message}`)
      probePostId = data.id
    }
    {
      const { data, error } = await svc
        .from('scheduled_emails')
        .insert({ status: 'draft', subject: 'ACCESS-AUDIT probe email' })
        .select('id')
        .single()
      if (error) throw new Error(`probe email: ${error.message}`)
      probeEmailId = data.id
      const log = await svc
        .from('email_send_log')
        .insert({ email_id: probeEmailId, recipient: 'access-audit-probe@example.com', status: 'sent' })
      if (log.error) throw new Error(`probe send log: ${log.error.message}`)
    }
    {
      await svc.from('push_subscriptions').delete().eq('endpoint', PROBE_ENDPOINT)
      const { error } = await svc
        .from('push_subscriptions')
        .insert({ endpoint: PROBE_ENDPOINT, p256dh: 'probe', auth: 'probe' })
      if (error) throw new Error(`probe subscription: ${error.message}`)
    }
    {
      const { data, error } = await svc.from('site_settings').select('id, email_default_subject').limit(1).single()
      if (error) throw new Error(`read site_settings: ${error.message}`)
      settingsRowId = data.id
      settingsSubject = data.email_default_subject
    }
  }, 120_000)

  afterAll(async () => {
    if (!svc) return
    if (probeRunId) await svc.from('runs').delete().eq('id', probeRunId)
    if (probePostId) await svc.from('posts').delete().eq('id', probePostId)
    if (probeEmailId) {
      await svc.from('email_send_log').delete().eq('email_id', probeEmailId)
      await svc.from('scheduled_emails').delete().eq('id', probeEmailId)
    }
    await svc.from('push_subscriptions').delete().eq('endpoint', PROBE_ENDPOINT)
    await svc.from('route_descriptions').delete().eq('slug', PROBE_SLUG)
    await svc.from('members').delete().eq('email', ANON_INSERT_EMAIL)
    await svc.from('members').delete().eq('email', VICTIM_EMAIL)
  }, 60_000)

  // ────────────────────────────────────────────────────────────────────────
  // Layer A - PostgREST / RLS
  // ────────────────────────────────────────────────────────────────────────

  describe('RLS: anon (public site data + registration)', () => {
    it('anon can read runs', async () => {
      const { data, error } = await anonClient().from('runs').select('id').eq('id', probeRunId)
      expect(error).toBeNull()
      expect(data?.length).toBe(1)
    })

    it('anon can read route_descriptions', async () => {
      const { error } = await anonClient().from('route_descriptions').select('slug').limit(1)
      expect(error).toBeNull()
    })

    it('anon can read site_settings', async () => {
      const { data, error } = await anonClient().from('site_settings').select('id').limit(1)
      expect(error).toBeNull()
      expect(data?.length).toBe(1)
    })

    it('anon cannot read members', async () => {
      const { data } = await anonClient().from('members').select('id').limit(5)
      expect(data ?? []).toHaveLength(0)
    })

    it('anon cannot see the draft probe post', async () => {
      const { data } = await anonClient().from('posts').select('id').eq('id', probePostId)
      expect(data ?? []).toHaveLength(0)
    })

    it('anon can INSERT a member (registration path)', async () => {
      const { error } = await anonClient().from('members').insert({
        email: ANON_INSERT_EMAIL,
        first_name: 'Access',
        last_name: 'TestAnonInsert',
        mobile: '07000000002',
        emergency_name: 'Access Test EC',
        emergency_phone: '07000000003',
        emergency_relationship: 'test',
        consent_data: true,
        health_declaration: true,
        consent_medical: true,
        photo_consent: false,
        email_opt_out: true,
      })
      expect(error).toBeNull()
      await svc.from('members').delete().eq('email', ANON_INSERT_EMAIL)
    })

    it('anon cannot UPDATE a run', async () => {
      const { count } = await anonClient()
        .from('runs')
        .update({ title: 'ACCESS-AUDIT probe run' }, { count: 'exact' })
        .eq('id', probeRunId)
      expect(count ?? 0).toBe(0)
    })
  })

  describe('RLS: member self-access (must stay green through the hardening)', () => {
    it('member can read their own row', async () => {
      const { data, error } = await restClients.member!.from('members').select('id, email').eq('email', MEMBER_EMAIL)
      expect(error).toBeNull()
      expect(data?.length).toBe(1)
    })

    it('member can update their own row (theme toggle path)', async () => {
      const { count, error } = await restClients.member!
        .from('members')
        .update({ theme: 'dark' }, { count: 'exact' })
        .eq('email', MEMBER_EMAIL)
      expect(error).toBeNull()
      expect(count).toBe(1)
    })

    it("member cannot read another member's row", async () => {
      const { data } = await restClients.member!.from('members').select('id').eq('email', LEADER_EMAIL)
      expect(data ?? []).toHaveLength(0)
    })

    it('leader can read their own row (nav is_run_leader lookup path)', async () => {
      const { data, error } = await restClients.leader!
        .from('members')
        .select('is_run_leader')
        .eq('email', LEADER_EMAIL)
      expect(error).toBeNull()
      expect(data?.length).toBe(1)
      expect(data?.[0]?.is_run_leader).toBe(true)
    })

    it("leader cannot read another member's row via RLS (contacts come from the server, not RLS)", async () => {
      const { data } = await restClients.leader!.from('members').select('id').eq('email', MEMBER_EMAIL)
      expect(data ?? []).toHaveLength(0)
    })
  })

  describe('RLS: authenticated member must NOT have admin-grade table access', () => {
    /**
     * Verify a write-hole by whether the row ACTUALLY changed (read back with
     * the service role), never by the count the member's own client returns.
     * A policy can grant UPDATE but not SELECT (site_settings does), so the
     * write lands while PostgREST returns count 0 - trusting that count would
     * be a false "blocked". Restores the column afterwards regardless.
     * Returns true if the member managed to mutate the row (i.e. hole open).
     */
    const memberCanMutate = async (
      table: string,
      id: string,
      column: string,
      original: unknown,
    ): Promise<boolean> => {
      const sentinel = `ACCESS-AUDIT ${table} ${Date.now()}`
      await restClients.member!.from(table).update({ [column]: sentinel }).eq('id', id)
      const { data } = await svc.from(table).select(column).eq('id', id).single()
      const mutated = (data as Record<string, unknown> | null)?.[column] === sentinel
      if (mutated) await svc.from(table).update({ [column]: original }).eq('id', id)
      return mutated
    }

    it('[HOLE] member cannot UPDATE a run', async () => {
      expect(await memberCanMutate('runs', probeRunId, 'title', 'ACCESS-AUDIT probe run')).toBe(false)
    })

    it('[HOLE] member cannot UPDATE a post', async () => {
      expect(await memberCanMutate('posts', probePostId, 'title', 'ACCESS-AUDIT probe post')).toBe(false)
    })

    // NOT a [HOLE]: already secure at the RLS layer. site_settings grants
    // authenticated UPDATE but no authenticated SELECT, so a member's update
    // locates 0 rows and silently no-ops (verified empirically - 204, row
    // unchanged). The audit originally listed this as a write-hole; it is not
    // exploitable via PostgREST. The only settings-write path that still needs
    // hardening is the /api/admin/settings route (requireAdmin), asserted below.
    it('member cannot UPDATE site_settings directly (no authenticated SELECT policy)', async () => {
      expect(await memberCanMutate('site_settings', settingsRowId, 'email_default_subject', settingsSubject)).toBe(false)
    })

    it('[HOLE] member cannot read scheduled_emails', async () => {
      const { data } = await restClients.member!.from('scheduled_emails').select('id').eq('id', probeEmailId)
      expect(data ?? []).toHaveLength(0)
    })

    it('[HOLE] member cannot read email_send_log (recipient addresses)', async () => {
      const { data } = await restClients.member!.from('email_send_log').select('id').eq('email_id', probeEmailId)
      expect(data ?? []).toHaveLength(0)
    })

    it('[HOLE] member cannot read push_subscriptions', async () => {
      const { data } = await restClients.member!
        .from('push_subscriptions')
        .select('endpoint')
        .eq('endpoint', PROBE_ENDPOINT)
      expect(data ?? []).toHaveLength(0)
    })

    it('[HOLE] member cannot INSERT route_descriptions', async () => {
      const { error } = await restClients.member!
        .from('route_descriptions')
        .insert({ slug: PROBE_SLUG, name: 'ACCESS-AUDIT probe' })
      await svc.from('route_descriptions').delete().eq('slug', PROBE_SLUG)
      expect(error).not.toBeNull()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Layer B - API routes over HTTP (needs the dev server)
  // ────────────────────────────────────────────────────────────────────────

  describe('API: role identification (/api/me)', () => {
    it('anon is neither leader nor admin', async () => {
      const res = await api('anon', 'GET', '/api/me')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.isLeader).toBe(false)
      expect(body.isAdmin).toBe(false)
    })

    it('member is neither leader nor admin', async () => {
      const body = await (await api('member', 'GET', '/api/me')).json()
      expect(body.isLeader).toBe(false)
      expect(body.isAdmin).toBe(false)
    })

    it('leader is a leader', async () => {
      const body = await (await api('leader', 'GET', '/api/me')).json()
      expect(body.isLeader).toBe(true)
    })

    it('admin is an admin', async () => {
      const body = await (await api('admin', 'GET', '/api/me')).json()
      expect(body.isAdmin).toBe(true)
    })
  })

  describe('API: leader emergency contacts (must stay green through the hardening)', () => {
    it('anon is redirected away from /leader', async () => {
      const res = await api('anon', 'GET', '/leader')
      expect([301, 302, 303, 307, 308]).toContain(res.status)
    })

    it('plain member is redirected away from /leader', async () => {
      const res = await api('member', 'GET', '/leader')
      expect([301, 302, 303, 307, 308]).toContain(res.status)
    })

    it('leader can load /leader (the emergency contacts page)', async () => {
      const res = await api('leader', 'GET', '/leader')
      expect(res.status).toBe(200)
    })

    it('leader can fetch a member emergency contact via the API', async () => {
      const res = await api('leader', 'GET', `/api/leader/member/${memberRowId}`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.emergency_name).toBe('Access Test EC')
    })

    it('plain member is forbidden from the emergency contact API', async () => {
      const res = await api('member', 'GET', `/api/leader/member/${leaderRowId}`)
      expect(res.status).toBe(403)
    })

    it('anon is unauthorized on the emergency contact API', async () => {
      const res = await api('anon', 'GET', `/api/leader/member/${leaderRowId}`)
      expect(res.status).toBe(401)
    })
  })

  describe('API: admin endpoints reject non-admins (the 8 unguarded routes)', () => {
    // Control: a route that already uses requireAdmin(), proving the
    // harness's member session is a normal session (not somehow broken).
    it('control: /api/admin/emails already rejects a member (401)', async () => {
      const res = await api('member', 'GET', '/api/admin/emails')
      expect(res.status).toBe(401)
    })

    it('control: /api/admin/emails admits the admin', async () => {
      const res = await api('admin', 'GET', '/api/admin/emails')
      expect(res.status).not.toBe(401)
    })

    const memberRejected = (name: string, call: () => Promise<Response>) => {
      it(`[HOLE] ${name} rejects a plain member with 401`, async () => {
        const res = await call()
        expect(res.status).toBe(401)
      })
    }

    memberRejected('GET /api/admin/posts', () => api('member', 'GET', '/api/admin/posts'))
    memberRejected('GET /api/admin/snippets', () => api('member', 'GET', '/api/admin/snippets'))
    memberRejected('POST /api/admin/notify', () => api('member', 'POST', '/api/admin/notify', { json: {} }))
    memberRejected('PATCH /api/admin/settings', () => api('member', 'PATCH', '/api/admin/settings', { json: {} }))
    memberRejected('POST /api/admin/upload', () => api('member', 'POST', '/api/admin/upload', { form: new FormData() }))
    memberRejected('PATCH /api/admin/posts/[id]', () => api('member', 'PATCH', `/api/admin/posts/${probePostId}`, { json: {} }))
    memberRejected('PATCH /api/admin/members/[id]', () => api('member', 'PATCH', `/api/admin/members/${victimRowId}`, { json: {} }))

    it('[HOLE] PATCH /api/admin/members/[id] status=inactive (deactivate a member) rejects a plain member with 401', async () => {
      // The damaging vector is PATCH (the route has no DELETE handler): setting
      // status=inactive deactivates and wipes a member's emergency data. Runs
      // against a sacrificial row (re-created active in setup each run). On the
      // un-hardened site this succeeds - the vulnerability being demonstrated.
      const res = await api('member', 'PATCH', `/api/admin/members/${victimRowId}`, { json: { status: 'inactive' } })
      expect(res.status).toBe(401)
    })

    it('admin passes the auth gate on the unguarded routes (not rejected with 401)', async () => {
      // Asserts only that the admin clears AUTH - not what happens afterwards
      // (e.g. /api/admin/notify 500s on dev where VAPID keys are unset; that is
      // downstream of the auth gate and irrelevant to access control).
      const notify = await api('admin', 'POST', '/api/admin/notify', { json: {} })
      expect(notify.status).not.toBe(401)
      const members = await api('admin', 'PATCH', `/api/admin/members/${memberRowId}`, { json: {} })
      expect(members.status).toBe(400) // past auth, stopped by "No valid fields to update"
      const posts = await api('admin', 'GET', '/api/admin/posts')
      expect(posts.status).not.toBe(401)
      const snippets = await api('admin', 'GET', '/api/admin/snippets')
      expect(snippets.status).not.toBe(401)
    })
  })
})
