import { describe, expect, it } from 'vitest'

import {
  createPatientSnsFindingSnapshot,
  getPatientSnsMeasurementResult,
  getPatientSnsObservedCount,
} from '@/lib/patientSnsMeasurement'

describe('patientSnsMeasurement', () => {
  it('snapshots only the selected measurement group', () => {
    expect(
      createPatientSnsFindingSnapshot('pulse', {
        'pulse-rate': '98 bpm',
        'pulse-rhythm': 'Regular',
        'pulse-strength': 'Moderate',
        'respiratory-rate': '22 breaths/min',
        'skin-extremities-note': 'Pale',
      }),
    ).toEqual({
      'pulse-rate': '98 bpm',
      'pulse-rhythm': 'Regular',
      'pulse-strength': 'Moderate',
    })
  })

  it('rounds observed counts to the nearest whole beat or breath', () => {
    expect(getPatientSnsObservedCount(98, 15)).toBe(25)
    expect(getPatientSnsObservedCount(98, 30)).toBe(49)
    expect(getPatientSnsObservedCount(22, 15)).toBe(6)
    expect(getPatientSnsObservedCount(22, 30)).toBe(11)
  })

  it('formats the exact pulse result', () => {
    expect(
      getPatientSnsMeasurementResult('pulse', {
        'pulse-rate': '98 bpm',
        'pulse-rhythm': 'Regular',
        'pulse-strength': 'Moderate',
      }),
    ).toEqual({
      lines: [
        'Rate: 98 bpm',
        '15 sec = 25 beats',
        '30 sec = 49 beats',
        'Rhythm: Regular',
        'Strength: Moderate',
      ],
      missingLabels: [],
    })
  })

  it('formats respiratory rhythm and effort without labels', () => {
    expect(
      getPatientSnsMeasurementResult('respiratory', {
        'respiratory-rate': '22 breaths/min',
        'respiratory-rhythm': 'Regular',
        'respiratory-strength': 'Mildly labored',
      }),
    ).toEqual({
      lines: [
        'Respiratory: 22 breaths/min',
        '15 sec = 6 breaths',
        '30 sec = 11 breaths',
        'Regular',
        'Mildly labored',
      ],
      missingLabels: [],
    })
  })

  it('omits derived counts for an invalid rate and reports canonical missing fields', () => {
    expect(
      getPatientSnsMeasurementResult('respiratory', {
        'respiratory-rate': 'Unknown',
        'respiratory-rhythm': 'Irregular',
      }),
    ).toEqual({
      lines: ['Respiratory: Unknown', 'Irregular'],
      missingLabels: ['Effort'],
    })
  })
})
