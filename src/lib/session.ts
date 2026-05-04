import { customAlphabet } from 'nanoid'

// 6-character uppercase alphanumeric session codes (no ambiguous chars like 0/O, 1/I)
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generate = customAlphabet(alphabet, 6)

export function generateSessionCode(): string {
  return generate()
}

export function isValidSessionCode(code: string): boolean {
  return /^[A-Z2-9]{6}$/.test(code)
}
