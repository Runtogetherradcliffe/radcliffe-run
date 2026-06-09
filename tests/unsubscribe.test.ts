/**
 * Tests for the HMAC unsubscribe tokens in lib/unsubscribe.ts.
 * One implementation signs links and verifies them; these tests pin the
 * round-trip and make sure forged or mangled tokens are rejected.
 */
import { describe, it, expect } from 'vitest'
import { makeUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/unsubscribe'

const MEMBER_ID = '7e6f9d7c-2f6c-4b3e-9a1d-0c8e5b4a3f21'

describe('unsubscribe token round-trip', () => {
  it('verifies a token it generated', () => {
    const token = makeUnsubscribeToken(MEMBER_ID)
    expect(verifyUnsubscribeToken(MEMBER_ID, token)).toBe(true)
  })

  it('rejects the token for a different member id', () => {
    const token = makeUnsubscribeToken(MEMBER_ID)
    expect(verifyUnsubscribeToken('00000000-0000-0000-0000-000000000000', token)).toBe(false)
  })

  it('rejects a tampered token', () => {
    const token = makeUnsubscribeToken(MEMBER_ID)
    const flipped = (token[0] === 'a' ? 'b' : 'a') + token.slice(1)
    expect(verifyUnsubscribeToken(MEMBER_ID, flipped)).toBe(false)
  })

  it('rejects garbage and empty tokens', () => {
    expect(verifyUnsubscribeToken(MEMBER_ID, 'not-hex-at-all')).toBe(false)
    expect(verifyUnsubscribeToken(MEMBER_ID, '')).toBe(false)
    expect(verifyUnsubscribeToken(MEMBER_ID, 'deadbeef')).toBe(false)
  })

  it('tokens are stable for the same member (links in old emails keep working)', () => {
    expect(makeUnsubscribeToken(MEMBER_ID)).toBe(makeUnsubscribeToken(MEMBER_ID))
  })
})
