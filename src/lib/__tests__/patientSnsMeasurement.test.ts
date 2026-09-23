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
        'pulse-speed': 'Fast',
        'respiratory-rate': '22 breaths/min',
        'skin-extremities-note': 'Pale',
      }),
    ).toEqual({
      'pulse-rate': '98 bpm',
      'pulse-rhythm': 'Regular',
      'pulse-strength': 'Moderate',
      'pulse-speed': 'Fast',
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
        'pulse-speed': 'Fast',
      }),
    ).toEqual({
      lines: [
        'Rate: 98bpm',
        '15 sec = 25',
        '30 sec = 49',
        'Moderate, regular, fast',
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
        'respiratory-speed': 'Fast',
      }),
    ).toEqual({
      lines: [
        'Rate: 22 breaths/min',
        '15 sec = 6',
        '30 sec = 11',
        'Mildly labored, regular, fast',
      ],
      missingLabels: [],
    })
  })

  it('formats shallow respiratory depth as effort without prefixes or duplicates', () => {
    expect(
      getPatientSnsMeasurementResult('respiratory', {
        'respiratory-rate': '8 breaths/min',
        'respiratory-rhythm': 'Rhythm: REGULAR',
        'respiratory-strength': 'Depth: SHALLOW, shallow, Labored',
        'respiratory-speed': 'Speed: SLOW',
      }),
    ).toEqual({
      lines: [
        'Rate: 8 breaths/min',
        '15 sec = 2',
        '30 sec = 4',
        'Shallow, labored, regular, slow',
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
      lines: ['Rate: Unknown', 'Irregular'],
      missingLabels: ['Effort'],
    })
  })

  it('normalizes legacy rate text, prefixes, casing, embedded speed, and duplicates', () => {
    expect(
      getPatientSnsMeasurementResult('pulse', {
        'pulse-rate': 'Rate: 156 bpm (15 sec = 39 beats',
        'pulse-rhythm': 'Rhythm: REGULAR',
        'pulse-strength': 'Strength: Strong, Fast',
        'pulse-speed': 'Speed: FAST',
      }),
    ).toEqual({
      lines: [
        'Rate: 156bpm',
        '15 sec = 39',
        '30 sec = 78',
        'Strong, regular, fast',
      ],
      missingLabels: [],
    })
  })

  it('preserves decimal precision while rounding only observed counts', () => {
    expect(
      getPatientSnsMeasurementResult('pulse', {
        'pulse-rate': '98.5 bpm',
        'pulse-rhythm': 'Regular',
        'pulse-strength': 'Strong',
      }).lines,
    ).toEqual(['Rate: 98.5bpm', '15 sec = 25', '30 sec = 49', 'Strong, regular'])
  })
})
