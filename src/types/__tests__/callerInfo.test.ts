import { describe, expect, it } from 'vitest'

import { DEFAULT_CALLER_INFO, normalizeCallerInfo } from '../callerInfo'

describe('normalizeCallerInfo', () => {
  it('fills missing fields from defaults', () => {
    expect(normalizeCallerInfo({ address: '123 Rue Principale' })).toEqual({
      ...DEFAULT_CALLER_INFO,
      address: '123 Rue Principale',
    })
  })

  it('returns defaults for missing caller info objects', () => {
    expect(normalizeCallerInfo(undefined)).toEqual(DEFAULT_CALLER_INFO)
    expect(normalizeCallerInfo(null)).toEqual(DEFAULT_CALLER_INFO)
  })
})
