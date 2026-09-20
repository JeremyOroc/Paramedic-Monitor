import { describe, expect, it } from 'vitest'

import { DEFAULT_DEFIBRILLATOR_MODEL, normalizeDefibrillatorModel } from '../defibrillator'

describe('defibrillator model contract', () => {
  it('recognizes all three explicit models', () => {
    expect(normalizeDefibrillatorModel('wagamiX')).toBe('wagamiX')
    expect(normalizeDefibrillatorModel('wagamiZ')).toBe('wagamiZ')
    expect(normalizeDefibrillatorModel('wagamiA')).toBe('wagamiA')
  })

  it('keeps the legacy unknown-model fallback on Wagami X', () => {
    expect(DEFAULT_DEFIBRILLATOR_MODEL).toBe('wagamiX')
    expect(normalizeDefibrillatorModel(undefined)).toBe('wagamiX')
    expect(normalizeDefibrillatorModel('unknown')).toBe('wagamiX')
  })
})
