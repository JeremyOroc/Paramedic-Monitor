import { createHash, randomBytes, timingSafeEqual } from 'crypto'

export type TokenKind = 'host' | 'participant'

export function createSessionToken(kind: TokenKind): string {
  return `${kind}_${randomBytes(24).toString('base64url')}`
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function verifySessionToken(token: string, hash: string): boolean {
  const tokenHash = hashSessionToken(token)
  const expected = Buffer.from(hash, 'hex')
  const actual = Buffer.from(tokenHash, 'hex')
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
