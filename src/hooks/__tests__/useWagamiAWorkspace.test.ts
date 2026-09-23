import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ETCO2_CALIBRATION_MS } from '@/components/monitor/SecondaryChannel'
import { ACQUIRE_MS } from '@/hooks/useMonitorController'
import { TWELVE_LEAD_SENT_MS } from '@/lib/twelveLeadTransmission'
import {
  ETCO2_CANCELLATION_CONFIRMATION_MS,
  MEDICATION_CONFIRMATION_MS,
  useWagamiAWorkspace,
} from '../useWagamiAWorkspace'

describe('useWagamiAWorkspace', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T14:00:00-04:00'))
    window.localStorage.clear()
  })

  it('keeps a 12-lead acquisition running after navigation and captures the original values', () => {
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80 }))
    act(() => {
      result.current.openTask('twelveLead')
      result.current.startTwelveLeadCapture()
      result.current.goBack()
      vi.advanceTimersByTime(ACQUIRE_MS)
    })
    expect(result.current.view).toBe('monitor')
    expect(result.current.twelveLead.lastCapture).toEqual({ rhythm: 'nsr', hr: 80 })
    expect(result.current.twelveLead.captureState).toBe('result')
  })

  it('records medication meaning independently of locale and nests the event log', () => {
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80 }))
    act(() => {
      result.current.setLocale('en')
      result.current.openTask('medications')
      result.current.recordMedication('Epi')
      result.current.setView('medicationLog')
    })
    expect(result.current.view).toBe('medicationLog')
    expect(result.current.medicationEvents[0]).toMatchObject({ medication: 'Epi', time: '14:00:00' })
  })

  it('briefly confirms only the latest accepted medication press', () => {
    const onStudentEvent = vi.fn()
    const { result } = renderHook(() => useWagamiAWorkspace({
      scope: 'preview',
      rhythm: 'nsr',
      hr: 80,
      onStudentEvent,
    }))

    act(() => result.current.recordMedication('Epi'))
    expect(result.current.flashedMedication).toBe('Epi')
    act(() => vi.advanceTimersByTime(MEDICATION_CONFIRMATION_MS - 1))
    expect(result.current.flashedMedication).toBe('Epi')

    act(() => result.current.recordMedication('Amio'))
    expect(result.current.flashedMedication).toBe('Amio')
    expect(result.current.medicationEvents).toHaveLength(2)
    expect(onStudentEvent).toHaveBeenCalledTimes(2)

    act(() => vi.advanceTimersByTime(MEDICATION_CONFIRMATION_MS))
    expect(result.current.flashedMedication).toBeNull()
  })

  it('returns directly from PNI settings to the monitor', () => {
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80 }))

    act(() => result.current.setView('nibpSettings'))
    expect(result.current.view).toBe('nibpSettings')

    act(() => result.current.goBack())
    expect(result.current.view).toBe('monitor')
  })

  it('keeps print and transmission inside the 12-lead workflow', () => {
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80 }))
    act(() => {
      result.current.startTwelveLeadCapture()
      vi.advanceTimersByTime(ACQUIRE_MS)
    })
    act(() => {
      result.current.closeTwelveLeadResult()
      result.current.openPrint()
    })
    expect(result.current.twelveLead.printOpen).toBe(true)
    act(() => {
      result.current.closeTwelveLeadOverlay()
      result.current.openTransmission()
    })
    act(() => {
      result.current.sendTwelveLead('CHUM')
    })
    expect(result.current.twelveLead.sentDestination).toBe('CHUM')
    act(() => vi.advanceTimersByTime(TWELVE_LEAD_SENT_MS))
    expect(result.current.twelveLead.transmissionOpen).toBe(false)
  })

  it('starts calibration inline, completes on its absolute deadline, and preserves completion across power-off', () => {
    const onStudentEvent = vi.fn()
    const { result } = renderHook(() => useWagamiAWorkspace({
      scope: 'preview',
      rhythm: 'nsr',
      hr: 80,
      monitorResetVersion: 4,
      onStudentEvent,
    }))
    act(() => result.current.openTask('etco2'))
    expect(result.current.view).toBe('monitor')
    expect(result.current.etco2Status).toBe('calibrating')
    expect(result.current.etco2StartedAt).toBe(Date.now())
    expect(result.current.etco2EndsAt).toBe(Date.now() + ETCO2_CALIBRATION_MS)
    act(() => vi.advanceTimersByTime(ETCO2_CALIBRATION_MS))
    expect(result.current.etco2Status).toBe('calibrated')
    expect(onStudentEvent).toHaveBeenCalledOnce()
    expect(onStudentEvent).toHaveBeenCalledWith({
      kind: 'etco2_calibration',
      label: 'EtCO2 Calibrated',
      payload: { monitorResetVersion: 4 },
    })
    act(() => {
      result.current.openTask('etco2')
      result.current.onDevicePowerOff()
    })
    expect(result.current.etco2Status).toBe('calibrated')
  })

  it('shows cancellation for three seconds, ignores presses during it, and then permits a retry', () => {
    const onStudentEvent = vi.fn()
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80, onStudentEvent }))
    act(() => result.current.openTask('etco2'))
    act(() => result.current.openTask('etco2'))
    expect(result.current.etco2Status).toBe('cancelled')
    expect(result.current.etco2CancellationEndsAt).toBe(Date.now() + ETCO2_CANCELLATION_CONFIRMATION_MS)

    act(() => result.current.openTask('etco2'))
    expect(result.current.etco2Status).toBe('cancelled')
    act(() => vi.advanceTimersByTime(ETCO2_CANCELLATION_CONFIRMATION_MS))
    expect(result.current.etco2Status).toBe('idle')

    act(() => result.current.openTask('etco2'))
    expect(result.current.etco2Status).toBe('calibrating')
    expect(onStudentEvent).not.toHaveBeenCalled()
  })

  it('clears unfinished and cancelled calibration on power-off', () => {
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80 }))
    act(() => {
      result.current.openTask('etco2')
      result.current.onDevicePowerOff()
      vi.advanceTimersByTime(ETCO2_CALIBRATION_MS)
    })
    expect(result.current.etco2Status).toBe('idle')

    act(() => result.current.openTask('etco2'))
    act(() => result.current.openTask('etco2'))
    expect(result.current.etco2Status).toBe('cancelled')
    act(() => result.current.onDevicePowerOff())
    expect(result.current.etco2Status).toBe('idle')
  })

  it('clears completed calibration when the monitor reset generation changes', () => {
    const { result, rerender } = renderHook(
      ({ resetVersion }) => useWagamiAWorkspace({
        scope: 'preview',
        rhythm: 'nsr',
        hr: 80,
        monitorResetVersion: resetVersion,
      }),
      { initialProps: { resetVersion: 0 } },
    )
    act(() => {
      result.current.openTask('etco2')
      vi.advanceTimersByTime(ETCO2_CALIBRATION_MS)
    })
    expect(result.current.etco2Status).toBe('calibrated')
    rerender({ resetVersion: 1 })
    expect(result.current.etco2Status).toBe('idle')
  })
})
