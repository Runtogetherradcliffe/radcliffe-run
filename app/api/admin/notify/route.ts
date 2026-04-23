import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Build a VAPID-signed push notification using Web Crypto API (no npm dependency)
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
  const subject = 'mailto:paul.j.cox@gmail.com'

  // Use web-push compatible approach via fetch to the endpoint
  // We build the Authorization header manually using VAPID
  const endpoint = new URL(subscription.endpoint)
  const audience = `${endpoint.protocol}//${endpoint.host}`
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60 // 12 hours

  // Build JWT header + payload
  const jwtHeader = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const jwtPayload = btoa(JSON.stringify({ aud: audience, exp: expiration, sub: subject }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${jwtHeader}.${jwtPayload}`

  // Import private key
  const privKeyBytes = base64urlToBytes(vapidPrivateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', privKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigBase64url = bytesToBase64url(new Uint8Array(signature))
  const jwt = `${signingInput}.${sigBase64url}`

  // Encrypt payload using Web Push encryption (RFC 8291)
  const encrypted = await encryptPayload(subscription, payload)

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: encrypted,
  })

  if (!response.ok && response.status !== 201) {
    throw new Error(`Push failed: ${response.status} ${response.statusText}`)
  }
}

// POST /api/admin/notify — send push notification to all subscribers
export async function POST(request: NextRequest) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, body, url } = await request.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  // Fetch all subscriptions
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0, message: 'No subscribers yet' })
  }

  const payload = JSON.stringify({
    title: title.trim(),
    body: body.trim(),
    url: url?.trim() || '/',
    tag: 'rtr-notification',
  })

  // Send to all subscribers, collecting results
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPushNotification(sub, payload))
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  // Remove any subscriptions that returned 404/410 (expired/unsubscribed)
  const expiredEndpoints: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const msg = (result.reason as Error).message
      if (msg.includes('404') || msg.includes('410')) {
        expiredEndpoints.push(subscriptions[i].endpoint)
      }
    }
  })
  if (expiredEndpoints.length > 0) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  return NextResponse.json({ sent, failed, total: subscriptions.length })
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    b64url.length + (4 - b64url.length % 4) % 4, '='
  )
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

function bytesToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function encryptPayload(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<Uint8Array> {
  const authBytes   = base64urlToBytes(subscription.auth)
  const p256dhBytes = base64urlToBytes(subscription.p256dh)

  // Generate ephemeral EC key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
  )

  // Import receiver's public key
  const receiverPublicKey = await crypto.subtle.importKey(
    'raw', p256dhBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublicKey }, ephemeralKeyPair.privateKey, 256
  )

  // Export ephemeral public key
  const ephemeralPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey)
  )

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF to derive content encryption key + nonce (RFC 8291)
  const encoder = new TextEncoder()

  const prk = await hkdf(
    new Uint8Array(sharedSecret),
    authBytes,
    concat(encoder.encode('WebPush: info\x00'), p256dhBytes, ephemeralPublicKeyBytes),
    32
  )

  const cek = await hkdf(prk, salt,
    concat(encoder.encode('Content-Encoding: aes128gcm\x00'), new Uint8Array(1)),
    16
  )

  const nonce = await hkdf(prk, salt,
    concat(encoder.encode('Content-Encoding: nonce\x00'), new Uint8Array(1)),
    12
  )

  // Encrypt content
  const cryptoKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const payloadBytes = encoder.encode(payload)
  const paddedPayload = concat(payloadBytes, new Uint8Array([2])) // delimiter

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cryptoKey, paddedPayload)
  )

  // Build RFC 8291 aes128gcm content-encoding header + ciphertext
  const recordSize = new Uint8Array(4)
  new DataView(recordSize.buffer).setUint32(0, 4096, false)

  return concat(
    salt,
    recordSize,
    new Uint8Array([ephemeralPublicKeyBytes.length]),
    ephemeralPublicKeyBytes,
    ciphertext
  )
}

async function hkdf(
  ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, keyMaterial, length * 8
  )
  return new Uint8Array(bits)
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length }
  return result
}
