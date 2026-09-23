import { describe, expect, it } from 'vitest'

import {
  isTimedSpO2Unavailable,
  parseTimedVitalsAutoSort,
  parseVitalsAutoSort,
} from '../vitalsAutoSort'

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

const MARKDOWN_SERIAL_VITALS_SAMPLE = [
  '## Initial Vitals',
  'Pulse: 128 bpm (15 sec = 32 beats, 30 sec = 64 beats), Fast, Regular, Thready',
  'SpO₂: 94% on room air',
  'BP: 94/60 mmHg',
  'Respirations: 28 breaths/min (15 sec = 7 breaths, 30 sec = 14 breaths), Fast, Regular, Labored',
  'Temp: 36.0°C',
  'EtCO₂: 30 mmHg',
  '',
  '# Treated Vitals',
  'Treatment pathway: supportive care',
  '',
  '## Treated (+5 min)',
  'Pulse: 126 bpm, Fast, Regular, Thready',
  'SpO₂: 97% with supplemental oxygen',
  'BP: 96/62 mmHg',
  'Respirations: 26 breaths/min, Fast, Regular, Labored',
  'EtCO₂: 31 mmHg',
  '---',
  '## Treated (+10 min)',
  'Pulse: 132 bpm, Fast, Regular, Thready',
  'SpO₂: 98% with supplemental oxygen',
  'BP: 92/58 mmHg',
  'Respirations: 28 breaths/min, Fast, Regular, Labored',
  'EtCO₂: 29 mmHg',
  '---',
  '## Treated (+15 min)',
  'Pulse: 138 bpm, Fast, Regular, Thready',
  'SpO₂: 97% with supplemental oxygen',
  'BP: 86/54 mmHg',
  'Respirations: 30 breaths/min, Fast, Regular, Labored',
  'EtCO₂: 26 mmHg',
  '---',
  '# Untreated Vitals',
  '## Untreated (+5 min)',
  'Pulse: 142 bpm, Fast, Regular, Thready',
  'SpO₂: 92% on room air',
  'BP: 82/50 mmHg',
  'Respirations: 32 breaths/min, Fast, Regular, Labored',
  'EtCO₂: 25 mmHg',
  '---',
  '## Untreated (+10 min)',
  'Pulse: 158 bpm, Fast, Regular, Barely Palpable',
  'SpO₂: 88% on room air',
  'BP: 66/38 mmHg',
  'Respirations: 36 breaths/min, Fast, Regular, Severely Labored',
  'EtCO₂: 18 mmHg',
  '---',
  '## Untreated (+15 min)',
  'Pulse: 46 bpm, Slow, Irregular, Barely Palpable',
  'SpO₂: Not reliably obtainable due to critically poor peripheral perfusion',
  'BP: 44/26 mmHg',
  'Respirations: 8 breaths/min, Slow, Irregular, Shallow',
  'EtCO₂: 10 mmHg',
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

  it('uses the Markdown Initial Vitals section instead of later serial values', () => {
    expect(parseVitalsAutoSort(MARKDOWN_SERIAL_VITALS_SAMPLE)).toEqual({
      hr: 128,
      spo2: 94,
      bp_sys: 94,
      bp_dia: 60,
      etco2: 30,
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

  it.each([
    ['T1', 126, 97, 96, 62, 31],
    ['T2', 132, 98, 92, 58, 29],
    ['T3', 138, 97, 86, 54, 26],
    ['U1', 142, 92, 82, 50, 25],
    ['U2', 158, 88, 66, 38, 18],
  ] as const)(
    'maps %s to the matching Markdown serial-vitals section',
    (slot, hr, spo2, bpSys, bpDia, etco2) => {
      expect(parseTimedVitalsAutoSort(MARKDOWN_SERIAL_VITALS_SAMPLE, slot)).toEqual({
        hr,
        spo2,
        bp_sys: bpSys,
        bp_dia: bpDia,
        etco2,
      })
    },
  )

  it('maps U3 while identifying its non-obtainable SpO2 value', () => {
    expect(parseTimedVitalsAutoSort(MARKDOWN_SERIAL_VITALS_SAMPLE, 'U3')).toEqual({
      hr: 46,
      bp_sys: 44,
      bp_dia: 26,
      etco2: 10,
    })
    expect(isTimedSpO2Unavailable(MARKDOWN_SERIAL_VITALS_SAMPLE, 'U3')).toBe(true)
    expect(isTimedSpO2Unavailable(MARKDOWN_SERIAL_VITALS_SAMPLE, 'U2')).toBe(false)
  })
})
