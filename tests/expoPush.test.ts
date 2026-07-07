/**
 * lib/expoPush.ts - the native counterpart of lib/brevo.ts. Contract under
 * test: never throws, batches 100 per request, counts tickets honestly,
 * prunes DeviceNotRegistered tokens, and pref-filters per event kind.
 * Supabase and fetch are mocked - no I/O.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const deleted: string[][] = []
let tokenRows: { token: string; prefs: { weekly?: boolean; alerts?: boolean } | null }[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: async () => ({ data: tokenRows, error: null }),
      delete: () => ({
        in: async (_col: string, tokens: string[]) => {
          deleted.push(tokens)
          return { data: null, error: null }
        },
      }),
    }),
  }),
}))

import { loadPushTokens, sendExpoPush } from '@/lib/expoPush'

const okTicket = { status: 'ok' }
const deadTicket = { status: 'error', details: { error: 'DeviceNotRegistered' } }

function mockFetchOnceTickets(tickets: unknown[]) {
  return vi.fn(async (_url: unknown, init?: { body?: string }) => {
    const batch = JSON.parse((init?.body as string) ?? '[]') as unknown[]
    return {
      ok: true,
      json: async () => ({ data: tickets.slice(0, batch.length) }),
    } as Response
  })
}

beforeEach(() => {
  deleted.length = 0
  tokenRows = []
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadPushTokens', () => {
  it('filters by the pref for the event kind (missing prefs default to on)', async () => {
    tokenRows = [
      { token: 'A', prefs: { weekly: true, alerts: false } },
      { token: 'B', prefs: { weekly: false, alerts: true } },
      { token: 'C', prefs: null },
    ]
    expect(await loadPushTokens('weekly')).toEqual(['A', 'C'])
    expect(await loadPushTokens('alerts')).toEqual(['B', 'C'])
  })
})

describe('sendExpoPush', () => {
  it('zero tokens is a clean no-op (no fetch)', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    const res = await sendExpoPush([], { title: 't', body: 'b' })
    expect(res).toEqual({ ok: true, sent: 0, failed: 0, pruned: 0 })
    expect(f).not.toHaveBeenCalled()
  })

  it('chunks into batches of 100', async () => {
    const f = mockFetchOnceTickets(Array(250).fill(okTicket))
    vi.stubGlobal('fetch', f)
    const tokens = Array.from({ length: 250 }, (_, i) => `T${i}`)
    const res = await sendExpoPush(tokens, { title: 't', body: 'b' })
    expect(f).toHaveBeenCalledTimes(3)
    const sizes = f.mock.calls.map(c => (JSON.parse((c[1]?.body as string) ?? '[]') as unknown[]).length)
    expect(sizes).toEqual([100, 100, 50])
    expect(res.sent).toBe(250)
    expect(res.ok).toBe(true)
  })

  it('counts failed tickets and prunes DeviceNotRegistered tokens', async () => {
    const f = mockFetchOnceTickets([okTicket, deadTicket, okTicket])
    vi.stubGlobal('fetch', f)
    const res = await sendExpoPush(['A', 'B', 'C'], { title: 't', body: 'b' })
    expect(res.sent).toBe(2)
    expect(res.failed).toBe(1)
    expect(res.pruned).toBe(1)
    expect(res.ok).toBe(false)
    expect(deleted).toEqual([['B']])
  })

  it('network failure to exp.host never throws - the whole chunk counts failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('fetch failed')
    }))
    const res = await sendExpoPush(['A', 'B'], { title: 't', body: 'b' })
    expect(res).toMatchObject({ ok: false, sent: 0, failed: 2, pruned: 0 })
    expect(deleted).toEqual([])
  })

  it('non-2xx response counts the chunk failed without pruning', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) }) as Response))
    const res = await sendExpoPush(['A'], { title: 't', body: 'b' })
    expect(res).toMatchObject({ ok: false, sent: 0, failed: 1, pruned: 0 })
  })
})
