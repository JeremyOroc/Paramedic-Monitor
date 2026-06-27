import { describe, expect, it } from 'vitest'

import { createSessionToken, hashSessionToken, verifySessionToken } from '../tokens'

describe('session tokens', () => {
  it('creates scoped host and participant tokens', () => {
    expect(createSessionToken('host')).toMatch(/^host_/)
    expect(createSessionToken('participant')).toMatch(/^participant_/)
  })

  it('verifies only the original token against its hash', () => {
    const token = createSessionToken('host')
    const hash = hashSessionToken(token)

    expect(hash).not.toBe(token)
    expect(verifySessionToken(token, hash)).toBe(true)
    expect(verifySessionToken(`${token}x`, hash)).toBe(false)
  })
})
