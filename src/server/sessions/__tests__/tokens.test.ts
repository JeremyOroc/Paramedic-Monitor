import { describe, expect, it } from 'vitest'

import { createSessionToken, hashSessionToken, verifySessionToken } from '../tokens'

describe('session tokens', () => {
  it('creates scoped controller and participant tokens', () => {
    expect(createSessionToken('controller')).toMatch(/^controller_/)
    expect(createSessionToken('participant')).toMatch(/^participant_/)
  })

  it('verifies only the original token against its hash', () => {
    const token = createSessionToken('controller')
    const hash = hashSessionToken(token)

    expect(hash).not.toBe(token)
    expect(verifySessionToken(token, hash)).toBe(true)
    expect(verifySessionToken(`${token}x`, hash)).toBe(false)
  })
})
