import { describe, expect, it } from 'vitest'

import {
  assertSameOrigin,
  parseEmail,
  parsePassword,
  parseUsername,
  safeInstructorPath,
} from '@/server/accounts/validation'

describe('account validation', () => {
  it('normalizes valid usernames while preserving their display spelling', () => {
    expect(parseUsername('  Dr.Sim_2  ')).toEqual({
      username: 'Dr.Sim_2',
      normalizedUsername: 'dr.sim_2',
    })
  })

  it.each(['a', 'ab', '-teacher', 'teacher-', 'teacher space', 'x'.repeat(31)])(
    'rejects invalid username %s',
    (username) => expect(() => parseUsername(username)).toThrow(),
  )

  it('validates email and the minimum password length', () => {
    expect(parseEmail(' Instructor@College.ca ')).toBe('instructor@college.ca')
    expect(parsePassword('12345678')).toBe('12345678')
    expect(() => parseEmail('not-an-email')).toThrow()
    expect(() => parsePassword('short')).toThrow('at least 8')
  })

  it('allows only instructor-local callback paths', () => {
    expect(safeInstructorPath('/instructor/account')).toBe('/instructor/account')
    expect(safeInstructorPath('https://evil.example')).toBe('/instructor')
    expect(safeInstructorPath('//evil.example/instructor')).toBe('/instructor')
    expect(safeInstructorPath('/admin')).toBe('/instructor')
  })

  it('requires browser mutations to come from the request origin', () => {
    expect(() => assertSameOrigin(new Request('https://monitor.example/api', {
      headers: { Origin: 'https://monitor.example' },
    }))).not.toThrow()
    expect(() => assertSameOrigin(new Request('https://monitor.example/api', {
      headers: { Origin: 'https://evil.example' },
    }))).toThrow('could not be verified')
  })
})
