import { describe, expect, it } from 'vitest'

import { parseTimedVitalsAutoSort, parseVitalsAutoSort } from '../vitalsAutoSort'

const TIMED_VITALS_SAMPLE = [
  'Treated (+5 min)',
  'Pulse: 106 bpm, Regular, Moderate',
  'SpO₂: 98% on O₂',
  'BP: 112/70 mmHg',
  'Respirations: 22 breaths/min, Regular, Unlabored',
  'Temp: 36.3°C',
  'EtCO₂: 36 mmHg',
  'Update: Bleeding controlled with dressing, mentation unchanged.',
  '',
  'Treated (+10 min)',
  'Pulse: 100 bpm, Regular, Moderate',
  'SpO₂: 99% on O₂',
  'BP: 118/74 mmHg',
  'Respirations: 20 breaths/min, Regular, Unlabored',
  'Temp: 36.4°C',
  'EtCO₂: 38 mmHg',
  '',
  'Untreated (+15 min)',
  'Pulse: 136 bpm, Regular, Thready',
  'SpO₂: 92% on room air',
  'BP: 76/46 mmHg',
  'Respirations: 30 breaths/min, Irregular, Weak respiratory effort',
  'Temp: 36.0°C',
  'EtCO₂: 26 mmHg',
].join('\n')

describe('parseVitalsAutoSort', () => {
  it('parses French and English vital labels', () => {
    expect(
      parseVitalsAutoSort(
        [
          'FC: 120',
          'SpO2: 96',
          'BP: 186/102',
          'EtCO2: 35',
        ].join('\n'),
      ),
    ).toEqual({
      hr: 120,
      spo2: 96,
      bp_sys: 186,
      bp_dia: 102,
      etco2: 35,
    })

    expect(
      parseVitalsAutoSort(
        [
          'HR: 90',
          'Saturation: 94',
          'TA: 95/60',
          'CO2: 42',
        ].join('\n'),
      ),
    ).toEqual({
      hr: 90,
      spo2: 94,
      bp_sys: 95,
      bp_dia: 60,
      etco2: 42,
    })
  })

  it('parses multiple blood pressure slash values as systolic over diastolic', () => {
    expect(parseVitalsAutoSort('BP: 186/102')).toEqual({
      bp_sys: 186,
      bp_dia: 102,
    })
    expect(parseVitalsAutoSort('BP: 95/60')).toEqual({
      bp_sys: 95,
      bp_dia: 60,
    })
  })

  it('parses separate BP sys and BP dia labels', () => {
    expect(
      parseVitalsAutoSort(
        [
          'BP sys: 140',
          'BP dia: 90',
          'Systolic: 130',
          'Diastolic: 80',
        ].join('\n'),
      ),
    ).toEqual({
      bp_sys: 140,
      bp_dia: 90,
    })
  })

  it('parses dash-separated labels', () => {
    expect(
      parseVitalsAutoSort(
        [
          'Heart Rate - 110',
          'Sat - 92',
          'Blood Pressure - 118/72',
          'ETCO2 - 30',
        ].join('\n'),
      ),
    ).toEqual({
      hr: 110,
      spo2: 92,
      bp_sys: 118,
      bp_dia: 72,
      etco2: 30,
    })
  })

  it('parses monitor-style values with units, notes, and subscript SpO2 labels', () => {
    expect(
      parseVitalsAutoSort(
        [
          'HR: 124 bpm',
          'SpO₂: 92% on room air',
          'BP: 148/86 mmHg',
          '',
          'EtCO₂: 48 mmHg',
        ].join('\n'),
      ),
    ).toEqual({
      hr: 124,
      spo2: 92,
      bp_sys: 148,
      bp_dia: 86,
      etco2: 48,
    })
  })

  it('parses pulse summary lines as heart rate only', () => {
    expect(parseVitalsAutoSort('Pulse: 136 bpm, Regular, Weak')).toEqual({
      hr: 136,
    })
    expect(parseVitalsAutoSort('Pulse rate: 92 bpm, Irregular, Strong')).toEqual({
      hr: 92,
    })
  })

  it('parses only the Vitals Origin section in a large scenario paste', () => {
    expect(
      parseVitalsAutoSort(
        [
          '### Dispatch Information',
          'CALL #: 2026-0612-1416',
          '',
          '### Vitals (Origin)',
          'HR: 54 bpm',
          'SpO\u2082: 78% on room air',
          'BP: 96/58 mmHg',
          'RR: 6 breaths/min',
          'Temp: 36.2Â°C',
          'EtCO\u2082: 62 mmHg',
          'Notes: pinpoint pupils',
          '',
          '---',
          '',
          '### Serial Vitals',
          'HR: 90 bpm',
          'SpO\u2082: 98% on O\u2082',
          'BP: 118/74 mmHg',
          'EtCO\u2082: 38 mmHg',
          '',
          '#### Untreated',
          'HR: 32 bpm',
          'SpO\u2082: 50% on room air',
          'BP: 68/40 mmHg',
          'EtCO\u2082: 85 mmHg',
        ].join('\n'),
      ),
    ).toEqual({
      hr: 54,
      spo2: 78,
      bp_sys: 96,
      bp_dia: 58,
      etco2: 62,
    })
  })

  it('detects alternate origin vitals headings and stops at the next major section', () => {
    expect(
      parseVitalsAutoSort(
        [
          'Origin Vitals',
          'HR: 54 bpm',
          'SpO\u2082: 78% on room air',
          'BP: 96/58 mmHg',
          'EtCO\u2082: 62 mmHg',
          '',
          'SAMPLE',
          'S: Opioid use disorder',
          '',
          'Serial Vitals',
          'HR: 90 bpm',
          'SpO\u2082: 98% on O\u2082',
          'BP: 118/74 mmHg',
          'EtCO\u2082: 38 mmHg',
        ].join('\n'),
      ),
    ).toEqual({
      hr: 54,
      spo2: 78,
      bp_sys: 96,
      bp_dia: 58,
      etco2: 62,
    })
  })

  it('keeps the first valid repeated vitals when no origin heading exists', () => {
    expect(
      parseVitalsAutoSort(
        [
          'HR: 54 bpm',
          'SpO\u2082: 78% on room air',
          'BP: 96/58 mmHg',
          'EtCO\u2082: 62 mmHg',
          '',
          'HR: 90 bpm',
          'SpO\u2082: 98% on O\u2082',
          'BP: 118/74 mmHg',
          'EtCO\u2082: 38 mmHg',
        ].join('\n'),
      ),
    ).toEqual({
      hr: 54,
      spo2: 78,
      bp_sys: 96,
      bp_dia: 58,
      etco2: 62,
    })
  })

  it('keeps the first repeated combined blood pressure pair', () => {
    expect(
      parseVitalsAutoSort(
        [
          'BP: 96/58 mmHg',
          'BP: 118/74 mmHg',
        ].join('\n'),
      ),
    ).toEqual({
      bp_sys: 96,
      bp_dia: 58,
    })
  })

  it('keeps first separate systolic and diastolic values', () => {
    expect(
      parseVitalsAutoSort(
        [
          'Systolic: 96',
          'Diastolic: 58',
          'BP sys: 118',
          'BP dia: 74',
        ].join('\n'),
      ),
    ).toEqual({
      bp_sys: 96,
      bp_dia: 58,
    })
  })

  it('ignores unknown and invalid labels', () => {
    expect(
      parseVitalsAutoSort(
        [
          'Scene: unsafe',
          'FC: fast',
          'BP: 120 over 80',
          'EtCO2:',
        ].join('\n'),
      ),
    ).toEqual({})
  })

  it('omits fields whose labels are missing', () => {
    expect(parseVitalsAutoSort('FC: 88')).toEqual({ hr: 88 })
  })

  it('parses Treated +5 timed vitals from a larger scenario paste', () => {
    expect(parseTimedVitalsAutoSort(TIMED_VITALS_SAMPLE, 'T1')).toEqual({
      hr: 106,
      spo2: 98,
      bp_sys: 112,
      bp_dia: 70,
      etco2: 36,
    })
  })

  it('parses Untreated +15 timed vitals from a larger scenario paste', () => {
    expect(parseTimedVitalsAutoSort(TIMED_VITALS_SAMPLE, 'U3')).toEqual({
      hr: 136,
      spo2: 92,
      bp_sys: 76,
      bp_dia: 46,
      etco2: 26,
    })
  })

  it('returns no values for a missing timed vitals section', () => {
    expect(parseTimedVitalsAutoSort(TIMED_VITALS_SAMPLE, 'T3')).toEqual({})
  })
})
