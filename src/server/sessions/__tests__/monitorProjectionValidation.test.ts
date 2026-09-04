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
})
