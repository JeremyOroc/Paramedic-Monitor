import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ETCO2_CALIBRATION_MS } from '@/components/monitor/SecondaryChannel'
import { ACQUIRE_MS } from '@/hooks/useMonitorController'
import { TWELVE_LEAD_SENT_MS } from '@/lib/twelveLeadTransmission'
import { useWagamiAWorkspace } from '../useWagamiAWorkspace'

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

  it('completes calibration on its existing timer and preserves the completed state across power-off', () => {
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80 }))
    act(() => result.current.startEtco2Calibration())
    act(() => vi.advanceTimersByTime(ETCO2_CALIBRATION_MS))
    expect(result.current.etco2Status).toBe('calibrated')
    act(() => {
      result.current.startEtco2Calibration()
      result.current.onDevicePowerOff()
    })
    expect(result.current.etco2Status).toBe('calibrated')
  })

  it('cancels an in-progress calibration on power-off', () => {
    const { result } = renderHook(() => useWagamiAWorkspace({ scope: 'preview', rhythm: 'nsr', hr: 80 }))
    act(() => {
      result.current.startEtco2Calibration()
      result.current.onDevicePowerOff()
      vi.advanceTimersByTime(ETCO2_CALIBRATION_MS)
    })
    expect(result.current.etco2Status).toBe('idle')
  })
})
