import { describe, expect, it } from 'vitest'

import { availableWagamiASelection, nextWagamiAAction, WAGAMI_A_MONITOR_ACTION_ORDER } from '../wagamiANavigation'

describe('Wagami A enabled inner-display navigation', () => {
  it('orders all six task launchers row-major before energy controls', () => {
    expect(WAGAMI_A_MONITOR_ACTION_ORDER).toEqual(['twelveLead', 'etco2', 'medications', 'callInfo', 'vitalLog', 'configure', 'energyDown', 'energyUp'])
  })

  it('wraps in both directions and skips disabled options', () => {
    const actions = [{ id: 'twelveLead', enabled: true }, { id: 'etco2', enabled: false }, { id: 'callInfo', enabled: true }]
    expect(nextWagamiAAction(actions, null, 1)).toBe('twelveLead')
    expect(nextWagamiAAction(actions, null, -1)).toBe('callInfo')
    expect(nextWagamiAAction(actions, 'twelveLead', 1)).toBe('callInfo')
    expect(nextWagamiAAction(actions, 'callInfo', 1)).toBe('twelveLead')
    expect(nextWagamiAAction(actions, 'twelveLead', -1)).toBe('callInfo')
  })

  it('excludes an unavailable remembered option and an empty action ring', () => {
    expect(availableWagamiASelection([{ id: 'task', enabled: false }], 'task')).toBeNull()
    expect(nextWagamiAAction([{ id: 'task', enabled: false }], null, 1)).toBeNull()
  })
})
