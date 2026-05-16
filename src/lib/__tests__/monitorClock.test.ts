import { describe, expect, it } from 'vitest'

import { EMPTY_MONITOR_CLOCK, formatMonitorClock } from '../monitorClock'

describe('formatMonitorClock', () => {
  it('returns a stable placeholder before client mount', () => {
    expect(formatMonitorClock(null, 'America/Toronto')).toEqual(EMPTY_MONITOR_CLOCK)
  })

  it('formats the monitor date and time in the requested timezone', () => {
    const now = new Date('2026-05-16T18:29:07Z')

    expect(formatMonitorClock(now, 'America/Toronto')).toEqual({
      date: '2026-05-16',
      time: '14:29:07',
    })
  })
})
