import { describe, expect, it } from 'vitest'

import { parseVitalsAutoSort } from '../vitalsAutoSort'

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
      bp_sys: 130,
      bp_dia: 80,
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

  it('ignores unknown and invalid labels', () => {
    expect(
      parseVitalsAutoSort(
        [
          'Scene: unsafe',
          'FC: fast',
          'BP: 120 over 80',
          'SpO2: 97%',
          'EtCO2:',
        ].join('\n'),
      ),
    ).toEqual({})
  })

  it('omits fields whose labels are missing', () => {
    expect(parseVitalsAutoSort('FC: 88')).toEqual({ hr: 88 })
  })
})
