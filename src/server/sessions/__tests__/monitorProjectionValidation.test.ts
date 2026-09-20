import { describe, expect, it } from 'vitest'

import { isMonitorProjection } from '@/server/sessions/service'

describe('monitor projection validation', () => {
  it('accepts the versioned semantic envelope shape', () => {
    expect(isMonitorProjection({
      version: 1,
      capturedAt: '2026-09-03T12:00:00.000Z',
      model: 'wagamiX',
      surface: 'monitor',
      controller: {},
      confirmed: {},
      confirmedVitalActive: {},
      acceptedBp: {},
      acceptedBpActive: {},
      callerInfo: {},
      dispatch: {},
      dispatchRoute: { geometry: [] },
      hospitalMap: {
        routeKind: 'transport',
        selectedHospitalId: 'chum',
        directoryOpen: true,
        fullscreen: true,
      },
      patientInfo: {},
      nibp: {},
      defib: {},
      alarms: [],
      mergedEventLog: [],
      vitalLog: [],
    })).toBe(true)
  })

  it('rejects unsupported versions and pixel-only payloads', () => {
    expect(isMonitorProjection({ version: 2, capturedAt: 'now' })).toBe(false)
    expect(isMonitorProjection({ screenshot: 'data:image/png;base64,abc' })).toBe(false)
  })

  it('accepts Wagami A without reinterpreting it as Wagami X', () => {
    const projection = {
      version: 1, capturedAt: '2026-09-15T12:00:00.000Z', model: 'wagamiA',
      surface: 'monitor', controller: {}, confirmed: {}, confirmedVitalActive: {},
      acceptedBp: {}, acceptedBpActive: {}, callerInfo: {}, dispatch: {},
      dispatchRoute: { geometry: [] }, patientInfo: {}, nibp: {}, defib: {},
      alarms: [], mergedEventLog: [], vitalLog: [],
    }
    expect(isMonitorProjection(projection)).toBe(true)
  })

  it('accepts semantic Wagami A view state and rejects a pixel payload in its place', () => {
    const projection = {
      version: 1, capturedAt: '2026-09-15T12:00:00.000Z', model: 'wagamiA',
      surface: 'monitor', controller: {}, confirmed: {}, confirmedVitalActive: {},
      acceptedBp: {}, acceptedBpActive: {}, callerInfo: {}, dispatch: {},
      dispatchRoute: { geometry: [] }, patientInfo: {}, nibp: {}, defib: {},
      alarms: [], mergedEventLog: [], vitalLog: [],
      wagamiA: { view: 'configure', preferences: { locale: 'fr', shellAlarmLedEnabled: true } },
    }
    expect(isMonitorProjection(projection)).toBe(true)
    expect(isMonitorProjection({ ...projection, wagamiA: [] })).toBe(false)
  })

  it('rejects a non-semantic hospital map payload', () => {
    expect(isMonitorProjection({
      version: 1,
      capturedAt: '2026-09-03T12:00:00.000Z',
      model: 'wagamiX',
      surface: 'monitor',
      controller: {},
      confirmed: {},
      confirmedVitalActive: {},
      acceptedBp: {},
      acceptedBpActive: {},
      callerInfo: {},
      dispatch: {},
      dispatchRoute: { geometry: [] },
      hospitalMap: [],
      patientInfo: {},
      nibp: {},
      defib: {},
      alarms: [],
      mergedEventLog: [],
      vitalLog: [],
    })).toBe(false)
  })
})
