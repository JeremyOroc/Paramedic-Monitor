import { describe, it, expect } from 'vitest'
import {
  clampAge,
  toggleSex,
  DEFAULT_PATIENT_INFO,
  PATIENT_AGE_MAX,
  PATIENT_AGE_MIN,
} from '../patientInfo'

describe('patientInfo helpers', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_PATIENT_INFO).toEqual({ age: 40, sex: 'M' })
  })

  it('clamps age to the editable range', () => {
    expect(clampAge(-5)).toBe(PATIENT_AGE_MIN)
    expect(clampAge(0)).toBe(0)
    expect(clampAge(63)).toBe(63)
    expect(clampAge(PATIENT_AGE_MAX)).toBe(120)
    expect(clampAge(999)).toBe(PATIENT_AGE_MAX)
  })

  it('rounds and guards non-finite ages', () => {
    expect(clampAge(40.6)).toBe(41)
    expect(clampAge(Number.NaN)).toBe(PATIENT_AGE_MIN)
  })

  it('toggles sex between M and F', () => {
    expect(toggleSex('M')).toBe('F')
    expect(toggleSex('F')).toBe('M')
  })
})
