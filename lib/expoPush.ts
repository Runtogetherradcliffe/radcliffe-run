/**
 * Expo Push sender - the native counterpart of lib/brevo.ts: plain fetch,
 * never throws, returns per-batch outcomes, prunes dead tokens.
 * One POST to exp.host covers up to 100 tokens (NATIVE_APP_SCOPE.md
 * section 2: at club scale a full broadcast is one or two requests).
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface ExpoPushResult {
  ok: boolean
  sent: number
  failed: number
  pruned: number
  error?: string
}

interface PushTokenRow {
  token: string
  prefs: { weekly?: boolean; alerts?: boolean } | null
}

/** Which pref gates an event kind. Manual/custom sends use 'alerts'. */
export type PushKind = 'weekly' | 'alerts'

export async function loadPushTokens(kind: PushKind): Promise<string[]> {
  const { data } = await supabaseAdmin().from('push_tokens').select('token, prefs')
  return ((data ?? []) as PushTokenRow[])
    .filter(row => {
      const prefs = row.prefs ?? {}
      return kind === 'weekly' ? prefs.weekly !== false : prefs.alerts !== false
    })
    .map(r => r.token)
}

export async function sendExpoPush(
  tokens: string[],
  message: { title: string; body: string; url?: string }
): Promise<ExpoPushResult> {
  if (tokens.length === 0) return { ok: true, sent: 0, failed: 0, pruned: 0 }

  let sent = 0
  let failed = 0
  const dead: string[] = []

  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100)
    const messages = chunk.map(to => ({
      to,
      title: message.title,
      body: message.body,
      data: { url: message.url ?? '/' },
      sound: 'default' as const,
    }))
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      })
      if (!res.ok) {
        failed += chunk.length
        continue
      }
      const json = (await res.json()) as {
        data?: { status: string; details?: { error?: string } }[]
      }
      ;(json.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent++
        } else {
          failed++
          if (ticket.details?.error === 'DeviceNotRegistered') {
            dead.push(chunk[idx])
          }
        }
      })
    } catch (err) {
      // Network failure to exp.host - count the chunk failed, never throw
      console.error('Expo push send error:', err)
      failed += chunk.length
    }
  }

  if (dead.length > 0) {
    await supabaseAdmin().from('push_tokens').delete().in('token', dead)
  }

  return { ok: failed === 0, sent, failed, pruned: dead.length }
}
