import { describe, expect, it } from 'vitest'

import {
  CALLER_INFO_DISPLAY_FIELDS,
  CALLER_INFO_FIELDS,
  DEFAULT_CALLER_INFO,
  normalizeCallerInfo,
} from '../callerInfo'

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

  it('does not expose the removed intervention priority field', () => {
    expect(DEFAULT_CALLER_INFO).not.toHaveProperty('interventionPriorityCode')
    expect(CALLER_INFO_FIELDS.map(({ field }) => field)).not.toContain(
      'interventionPriorityCode',
    )
    expect(CALLER_INFO_DISPLAY_FIELDS.map(({ field }) => field)).not.toContain(
      'interventionPriorityCode',
    )
  })

  it('drops removed intervention priority data during normalization', () => {
    const normalized = normalizeCallerInfo({
      address: '123 Rue Principale',
      interventionPriorityCode: 'Code 3',
    } as unknown as Partial<typeof DEFAULT_CALLER_INFO>)

    expect(normalized).toEqual({
      ...DEFAULT_CALLER_INFO,
      address: '123 Rue Principale',
    })
    expect(normalized).not.toHaveProperty('interventionPriorityCode')
  })
})
