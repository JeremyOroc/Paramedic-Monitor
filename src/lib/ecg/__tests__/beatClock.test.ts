import { describe, expect, it } from 'vitest'

import { createBeatClock } from '../beatClock'

describe('createBeatClock', () => {
  it('keeps one phase through staggered readers and rate changes', () => {
    const clock = createBeatClock(1000)
    expect(clock.phase(1250, 1000)).toBeCloseTo(0.25)
    expect(clock.phase(1250, 1000)).toBeCloseTo(0.25)
    expect(clock.phase(1500, 500)).toBeCloseTo(0.75)
    expect(clock.phase(1750, 500)).toBeCloseTo(0.25)
  })

  it('resets only when a true signal boundary requests it', () => {
    const clock = createBeatClock(0)
    expect(clock.phase(400, 1000)).toBeCloseTo(0.4)
    clock.reset(400)
    expect(clock.phase(400, 1000)).toBe(0)
    expect(clock.phase(650, 1000)).toBeCloseTo(0.25)
  })
})
