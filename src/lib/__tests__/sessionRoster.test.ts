import { describe, it, expect } from 'vitest'

import {
  CONNECTED_WINDOW_MS,
  anyoneCalibratedEtco2,
  isConnected,
  participantProgress,
} from '../sessionRoster'
import type { StudentEvent } from '@/types/session'

const NOW = Date.parse('2026-07-04T12:00:00.000Z')

function makeEvent(overrides: Partial<StudentEvent>): StudentEvent {
  return {
    id: 'event-id',
    session_id: 'session-id',
    participant_id: 'student-1',
    attempt_version: 1,
    kind: 'acknowledge',
    label: 'Acknowledge',
    payload: {},
    occurred_at: '2026-07-04T11:59:00.000Z',
    ...overrides,
  }
}

describe('isConnected', () => {
  it('is true for a heartbeat inside the window and false outside it', () => {
    const recent = new Date(NOW - CONNECTED_WINDOW_MS + 1000).toISOString()
    const stale = new Date(NOW - CONNECTED_WINDOW_MS - 1000).toISOString()
    expect(isConnected(recent, NOW)).toBe(true)
    expect(isConnected(stale, NOW)).toBe(false)
  })

  it('is false for missing or malformed timestamps', () => {
    expect(isConnected(null, NOW)).toBe(false)
    expect(isConnected(undefined, NOW)).toBe(false)
    expect(isConnected('not-a-date', NOW)).toBe(false)
  })
})

describe('anyoneCalibratedEtco2', () => {
  it('is true once any student calibrates on the current attempt', () => {
    const events = [makeEvent({ id: 'e1', kind: 'arrival' })]
    expect(anyoneCalibratedEtco2(events, 1)).toBe(false)

    const calibrated = [
      ...events,
      makeEvent({ id: 'e2', kind: 'etco2_calibration', participant_id: 'student-3' }),
    ]
    expect(anyoneCalibratedEtco2(calibrated, 1)).toBe(true)
  })

  it('clears on a new attempt', () => {
    const events = [makeEvent({ id: 'e1', kind: 'etco2_calibration', attempt_version: 1 })]
    expect(anyoneCalibratedEtco2(events, 1)).toBe(true)
    expect(anyoneCalibratedEtco2(events, 2)).toBe(false)
  })
})

describe('participantProgress', () => {
  it('derives gate milestones and action counts from the student events', () => {
    const events = [
      makeEvent({ id: 'e1', kind: 'acknowledge' }),
      makeEvent({ id: 'e2', kind: 'arrival' }),
      makeEvent({ id: 'e3', kind: 'shock' }),
      makeEvent({ id: 'e4', kind: 'shock' }),
      makeEvent({ id: 'e5', kind: 'medication' }),
      makeEvent({ id: 'e6', kind: 'analyze' }),
      makeEvent({ id: 'e7', kind: 'etco2_calibration' }),
    ]

    expect(participantProgress(events, 'student-1', 1)).toEqual({
      acknowledged: true,
      arrived: true,
      transported: false,
      shocks: 2,
      medications: 1,
      analyzes: 1,
      etco2Calibrated: true,
    })
  })

  it('reports EtCO2 as uncalibrated until the calibration event arrives', () => {
    const before = [makeEvent({ id: 'e1', kind: 'arrival' })]
    expect(participantProgress(before, 'student-1', 1).etco2Calibrated).toBe(false)

    const after = [...before, makeEvent({ id: 'e2', kind: 'etco2_calibration' })]
    expect(participantProgress(after, 'student-1', 1).etco2Calibrated).toBe(true)
  })

  it('does not credit one student calibration to another student', () => {
    const events = [
      makeEvent({ id: 'e1', kind: 'etco2_calibration', participant_id: 'student-2' }),
    ]
    expect(participantProgress(events, 'student-1', 1).etco2Calibrated).toBe(false)
    expect(participantProgress(events, 'student-2', 1).etco2Calibrated).toBe(true)
  })

  it('clears EtCO2 calibration on a new attempt', () => {
    const events = [makeEvent({ id: 'e1', kind: 'etco2_calibration', attempt_version: 1 })]
    expect(participantProgress(events, 'student-1', 1).etco2Calibrated).toBe(true)
    expect(participantProgress(events, 'student-1', 2).etco2Calibrated).toBe(false)
  })

  it('ignores other participants and other attempt versions', () => {
    const events = [
      makeEvent({ id: 'e1', kind: 'acknowledge', participant_id: 'student-2' }),
      makeEvent({ id: 'e2', kind: 'shock', attempt_version: 2 }),
    ]

    expect(participantProgress(events, 'student-1', 1)).toEqual({
      acknowledged: false,
      arrived: false,
      transported: false,
      shocks: 0,
      medications: 0,
      analyzes: 0,
      etco2Calibrated: false,
    })
  })
})
