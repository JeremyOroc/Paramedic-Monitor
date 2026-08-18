import { describe, expect, it } from 'vitest'

import { CPR_HEART_RATE_BY_MODE, getActiveAlarms, getCprHeartRate } from '../vitals'

const healthyVitals = {
  hr: 80,
  bp_sys: 120,
  bp_dia: 80,
  spo2: 98,
}

describe('CPR heart rate', () => {
  it('maps Off, Regular CPR, and Weak CPR to their effective FC values', () => {
    expect(CPR_HEART_RATE_BY_MODE).toEqual({
      off: null,
      regular: 120,
      weak: 90,
    })
    expect(getCprHeartRate('off')).toBeNull()
    expect(getCprHeartRate('regular')).toBe(120)
    expect(getCprHeartRate('weak')).toBe(90)
  })
})

describe('getActiveAlarms', () => {
  it('returns no alarms for healthy vitals', () => {
    expect(getActiveAlarms(healthyVitals)).toEqual([])
  })

  it('alarms HR below 40 or above 140 bpm', () => {
    expect(getActiveAlarms({ ...healthyVitals, hr: 39 })).toEqual(['hr'])
    expect(getActiveAlarms({ ...healthyVitals, hr: 141 })).toEqual(['hr'])
    expect(getActiveAlarms({ ...healthyVitals, hr: 40 })).toEqual([])
    expect(getActiveAlarms({ ...healthyVitals, hr: 140 })).toEqual([])
  })

  it('alarms BP when systolic or diastolic crosses the client thresholds', () => {
    expect(getActiveAlarms({ ...healthyVitals, bp_sys: 89 })).toEqual(['bp'])
    expect(getActiveAlarms({ ...healthyVitals, bp_sys: 201 })).toEqual(['bp'])
    expect(getActiveAlarms({ ...healthyVitals, bp_dia: 24 })).toEqual(['bp'])
    expect(getActiveAlarms({ ...healthyVitals, bp_dia: 226 })).toEqual(['bp'])
    expect(getActiveAlarms({ ...healthyVitals, bp_sys: 90, bp_dia: 25 })).toEqual([])
    expect(getActiveAlarms({ ...healthyVitals, bp_sys: 200, bp_dia: 225 })).toEqual([])
  })

  it('alarms SpO2 below 90 percent and does not alarm EtCO2', () => {
    expect(getActiveAlarms({ ...healthyVitals, spo2: 89 })).toEqual(['spo2'])
    expect(getActiveAlarms({ ...healthyVitals, spo2: 90 })).toEqual([])
  })

  it('reports multiple active alarms without duplicates', () => {
    expect(
      getActiveAlarms({
        hr: 160,
        bp_sys: 220,
        bp_dia: 230,
        spo2: 70,
      }),
    ).toEqual(['hr', 'bp', 'spo2'])
  })

  it('does not alarm inactive vitals even when their stored value is 0', () => {
    expect(
      getActiveAlarms(
        {
          hr: 0,
          bp_sys: 0,
          bp_dia: 0,
          spo2: 0,
        },
        {
          hr: false,
          bp_sys: false,
          bp_dia: false,
          spo2: false,
        },
      ),
    ).toEqual([])
  })

  it('alarms an active vital with value 0', () => {
    expect(
      getActiveAlarms(
        {
          ...healthyVitals,
          hr: 0,
        },
        {
          hr: true,
          bp_sys: false,
          bp_dia: false,
          spo2: false,
        },
      ),
    ).toEqual(['hr'])
  })
})
