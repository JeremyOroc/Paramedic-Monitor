import { describe, it, expect } from 'vitest'

import { formatEstTime } from '../estTime'

describe('formatEstTime', () => {
  it('formats a winter (EST, UTC-5) instant in 24h HH:MM:SS', () => {
    // 2026-01-15T18:30:45Z → 13:30:45 EST
    expect(formatEstTime(new Date('2026-01-15T18:30:45Z'))).toBe('13:30:45')
  })

  it('shifts by one hour during daylight saving (EDT, UTC-4)', () => {
    // 2026-07-15T18:30:45Z → 14:30:45 EDT
    expect(formatEstTime(new Date('2026-07-15T18:30:45Z'))).toBe('14:30:45')
  })

  it('renders midnight Eastern as 00, not 24', () => {
    // 2026-01-16T05:00:00Z → 00:00:00 EST
    expect(formatEstTime(new Date('2026-01-16T05:00:00Z'))).toBe('00:00:00')
  })
})
