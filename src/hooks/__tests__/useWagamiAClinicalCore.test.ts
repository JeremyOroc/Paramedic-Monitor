import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { DEFAULT_VITALS } from '@/types/vitals'
import { useWagamiAClinicalCore } from '../useWagamiAClinicalCore'

const audio = vi.hoisted(() => ({
  playSystemAudio: vi.fn(),
  playCprAudioSequence: vi.fn((onEnded?: () => void) => void onEnded),
  playCprMetronome: vi.fn(),
  playAlarm: vi.fn(),
  pauseAlarm: vi.fn(),
  playChargeBeep: vi.fn(),
  pauseChargeBeep: vi.fn(),
  playShockReadyBeep: vi.fn(),
  pauseShockReadyBeep: vi.fn(),
  setAudioMuted: vi.fn(),
  stopAllAudio: vi.fn(),
}))
vi.mock('@/lib/audio', () => audio)

const normal: WagamiADisplayState = {
  vitals: { ...DEFAULT_VITALS },
  active: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
  simulated: true,
  alarms: [],
}

describe('Wagami A Room-free clinical core', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('cycles three modes, locks throughout Analyze, and cancels on Power-off', () => {
    const onStudentEvent = vi.fn()
    const { result } = renderHook(() => useWagamiAClinicalCore({
      sourceDisplay: normal, cprMode: 'off', onStudentEvent,
    }))
    act(() => result.current.onPatientModeCycle())
    expect(result.current.patientMode).toBe('pediatric')
    expect(result.current.defib.energy).toBe(50)
    act(() => result.current.onPatientModeCycle())
    expect(result.current.patientMode).toBe('neonate')
    act(() => result.current.onPatientModeCycle())
    expect(result.current.patientMode).toBe('adult')

    act(() => result.current.onAnalyse())
    expect(result.current.patientModeLocked).toBe(true)
    act(() => result.current.onPatientModeCycle())
    expect(result.current.patientMode).toBe('adult')
    expect(result.current.defib.energy).toBe(120)
    act(() => result.current.onPowerToggle())
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.poweredOn).toBe(false)
    expect(result.current.defib.state).toBe('idle')
    expect(result.current.patientModeLocked).toBe(false)
    expect(onStudentEvent).toHaveBeenCalledWith({ kind: 'power_off', label: 'Power Off' })
    expect(onStudentEvent).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'analyze' }))
    expect(audio.stopAllAudio).toHaveBeenCalled()
    act(() => result.current.onPowerToggle())
    expect(result.current.poweredOn).toBe(true)
  })

  it('charges after advice and emits only one guarded Shock event', () => {
    const onStudentEvent = vi.fn()
    const shockable = { ...normal, vitals: { ...normal.vitals, rhythm: 'vf' as const } }
    const { result } = renderHook(() => useWagamiAClinicalCore({
      sourceDisplay: shockable, cprMode: 'off', onStudentEvent,
    }))
    act(() => result.current.onAnalyse())
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.defib.state).toBe('shock_advised')
    expect(result.current.patientModeLocked).toBe(true)
    expect(result.current.defib.canShock).toBe(false)
    act(() => result.current.onShock())
    expect(onStudentEvent).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'shock' }))

    act(() => result.current.onCharge())
    expect(result.current.defib.state).toBe('charging')
    act(() => vi.advanceTimersByTime(4000))
    expect(result.current.defib.state).toBe('charged')
    expect(result.current.patientModeLocked).toBe(true)
    const guardedPress = result.current.onShock
    act(() => {
      guardedPress()
      guardedPress()
    })
    expect(result.current.defib.state).toBe('cpr')
    expect(result.current.defib.shockCount).toBe(1)
    expect(onStudentEvent.mock.calls.filter(([event]) => event.kind === 'shock')).toHaveLength(1)
    expect(onStudentEvent.mock.calls.filter(([event]) => event.kind === 'charge')).toHaveLength(1)
    expect(onStudentEvent.mock.calls.filter(([event]) => event.kind === 'analyze')).toHaveLength(1)
  })

  it('accepts BP only after the cuff cycle and suppresses its alarm while reading', () => {
    const onStudentEvent = vi.fn()
    const onAcceptBpReading = vi.fn()
    const lowBp = { ...normal, vitals: { ...normal.vitals, bp_sys: 80, bp_dia: 20 } }
    const { result } = renderHook(() => useWagamiAClinicalCore({
      sourceDisplay: lowBp, cprMode: 'off', onStudentEvent, onAcceptBpReading,
    }))
    expect(result.current.display.alarms).not.toContain('bp')
    act(() => result.current.onReadBP())
    expect(result.current.nibpPhase).toBe('please_wait')
    expect(result.current.display.alarms).not.toContain('bp')
    act(() => vi.advanceTimersByTime(3000 + 500 + 8000 + 500))
    expect(result.current.nibpPhase).toBe('settled')
    expect(onAcceptBpReading).toHaveBeenCalledOnce()
    expect(result.current.display.vitals.bp_sys).toBe(80)
    expect(result.current.display.alarms).toContain('bp')
    expect(onStudentEvent.mock.calls.filter(([event]) => event.kind === 'nibp_start')).toHaveLength(1)
    expect(onStudentEvent.mock.calls.filter(([event]) => event.kind === 'nibp_result')).toHaveLength(1)
    act(() => result.current.onReadBP())
    expect(result.current.display.alarms).not.toContain('bp')
    act(() => result.current.onReadBP())
    expect(result.current.nibpPhase).toBe('idle')
    expect(onStudentEvent.mock.calls.filter(([event]) => event.kind === 'nibp_start')).toHaveLength(2)
    act(() => result.current.onMute())
    expect(result.current.muted).toBe(true)
    expect(result.current.display.alarms).toContain('bp')
    expect(audio.setAudioMuted).toHaveBeenCalledWith(true)
    act(() => result.current.onPowerToggle())
    expect(result.current.display.alarms).not.toContain('bp')
    expect(audio.setAudioMuted).toHaveBeenCalledWith(false)
  })

  it('uses the CPR override and emits one energy event per permitted touch', () => {
    const onStudentEvent = vi.fn()
    const { result } = renderHook(() => useWagamiAClinicalCore({
      sourceDisplay: normal, cprMode: 'regular', onStudentEvent,
    }))
    expect(result.current.cprOverride).toBe(true)
    expect(result.current.display.vitals.hr).toBe(120)
    act(() => result.current.onEnergyUp())
    expect(result.current.defib.energy).toBe(130)
    expect(onStudentEvent).toHaveBeenCalledWith({
      kind: 'energy_change', label: 'Energy Up', payload: { from: 120, to: 130 },
    })
    act(() => result.current.onAnalyse())
    act(() => result.current.onEnergyDown())
    expect(result.current.defib.energy).toBe(130)
    expect(onStudentEvent.mock.calls.filter(([event]) => event.kind === 'energy_change')).toHaveLength(1)
  })

  it('keeps confirmed pending BP off the fixed card until cuff acceptance', () => {
    const confirmed = { ...normal, simulated: false }
    const { result } = renderHook(() => useWagamiAClinicalCore({
      sourceDisplay: confirmed, cprMode: 'off',
    }))
    expect(result.current.display.active.bp_sys).toBe(false)
    expect(result.current.display.active.bp_dia).toBe(false)
    act(() => result.current.onReadBP())
    act(() => vi.advanceTimersByTime(3000 + 500 + 8000 + 500))
    expect(result.current.display.active.bp_sys).toBe(true)
    expect(result.current.display.active.bp_dia).toBe(true)
  })
})
