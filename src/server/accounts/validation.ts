import { createHash, timingSafeEqual } from 'node:crypto'

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,28}[A-Za-z0-9]$/

export class AccountInputError extends Error {
  constructor(
    message: string,
    readonly field?: 'username' | 'email' | 'password' | 'registrationCode',
  ) {
    super(message)
    this.name = 'AccountInputError'
  }
}

export function parseUsername(value: unknown) {
  if (typeof value !== 'string') {
    throw new AccountInputError('Enter a username.', 'username')
  }
  const username = value.trim()
  if (!USERNAME_PATTERN.test(username)) {
    throw new AccountInputError(
      'Use 3–30 characters. Start and end with a letter or number; periods, underscores, and hyphens are allowed inside.',
      'username',
    )
  }
  return { username, normalizedUsername: username.toLowerCase() }
}

export function parseEmail(value: unknown) {
  if (typeof value !== 'string') {
    throw new AccountInputError('Enter a valid email address.', 'email')
  }
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AccountInputError('Enter a valid email address.', 'email')
  }
  return email
}

export function parsePassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new AccountInputError('Password must be at least 8 characters.', 'password')
  }
  if (value.length > 1024) {
    throw new AccountInputError('Password is too long.', 'password')
  }
  return value
}

export function parseRegistrationCode(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AccountInputError('Enter the instructor registration code.', 'registrationCode')
  }
  if (value.length > 512) {
    throw new AccountInputError('The instructor registration code is too long.', 'registrationCode')
  }
  return value
}

export function registrationCodeMatches(candidate: string, expected: string | undefined) {
  if (!expected) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(candidate), digest(expected))
}

export function safeInstructorPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/instructor') || value.startsWith('//')) {
    return '/instructor'
  }
  return value
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    throw new AccountInputError('This request could not be verified.')
  }
}
