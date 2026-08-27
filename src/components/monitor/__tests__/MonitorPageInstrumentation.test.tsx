import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { useMonitorStore } from '@/store/monitorStore'
import { STUDENT_EVENT_KINDS } from '@/types/session'

import { MonitorPage } from '../MonitorPage'

vi.mock('@/lib/audio', () => ({
  pauseAlarm: vi.fn(),
  playAlarm: vi.fn(),
  playCallerInfoAlert: vi.fn(),
  setAudioMuted: vi.fn(),
  playChargeBeep: vi.fn(),
  pauseChargeBeep: vi.fn(),
  playShockReadyBeep: vi.fn(),
  pauseShockReadyBeep: vi.fn(),
  playSystemAudio: vi.fn(),
  playCprAudioSequence: vi.fn(),
  stopCprAudioSequence: vi.fn(),
  stopAllAudio: vi.fn(),
}))

vi.mock('@/components/monitor/WaveformPanel', () => ({
  WaveformPanel: () => <div>Waveform panel</div>,
}))

/**
 * Exposes every control Phase 12d instruments. The shell in page.test.tsx only
 * surfaces the soft keys that file exercises; the evaluation record depends on
 * the power, energy, and 12-lead controls too, so this shell reaches all of them.
 */
vi.mock('@/components/monitor/DeviceShell', () => ({
  DeviceShell: ({
    screen: screenContent,
    defib,
    softKeys,
    audio,
    power,
  }: {
    screen: ReactNode
    defib: { onEnergyUp: () => void; onEnergyDown: () => void }
    softKeys: {
      onTwelveLead: () => void
      onToggleEtco2: () => void
      onTreatment: () => void
      onPatientInfo: () => void
      onCaptureTwelveLead: () => void
      onPrint: () => void
    }
    audio?: { onPatientEvent?: () => void }
    power: { onPowerOn: () => void; onPowerOff: () => void }
  }) => (
    <div data-testid="device-shell">
      {screenContent}
      <button type="button" onClick={power.onPowerOn}>Power On</button>
      <button type="button" onClick={power.onPowerOff}>Power Off</button>
      <button type="button" onClick={softKeys.onTwelveLead}>12-Lead</button>
      <button type="button" onClick={softKeys.onCaptureTwelveLead}>Capture 12-Lead</button>
      <button type="button" onClick={softKeys.onPrint}>Print</button>
      <button type="button" onClick={softKeys.onTreatment}>Treatment</button>
      <button type="button" onClick={softKeys.onPatientInfo}>Patient Info</button>
      <button type="button" onClick={softKeys.onToggleEtco2}>Toggle EtCO2</button>
      <button type="button" onClick={defib.onEnergyUp}>Energy Up</button>
      <button type="button" onClick={defib.onEnergyDown}>Energy Down</button>
      <button type="button" onClick={audio?.onPatientEvent}>Patient event</button>
    </div>
  ),
}))

function renderMonitor() {
  const onStudentEvent = vi.fn()
  render(<MonitorPage onStudentEvent={onStudentEvent} />)
  return onStudentEvent
}

/**
 * The BP button is only wired when BP is an active vital, so any test touching
 * NIBP has to have the instructor send one first.
 */
function sendActiveBp(bpSys: number, bpDia: number) {
  const store = useMonitorStore.getState()
  store.setDraft('bp_sys', bpSys)
  store.setDraft('bp_dia', bpDia)
  store.setDraftVitalActive('bp_sys', true)
  store.setDraftVitalActive('bp_dia', true)
  store.save()
  store.send()
}

function kindsFrom(onStudentEvent: ReturnType<typeof vi.fn>): string[] {
  return onStudentEvent.mock.calls.map(([event]) => event.kind)
}

beforeEach(() => {
  vi.useRealTimers()
  useMonitorStore.getState().reset()
  window.history.pushState({}, '', '/?dev=1')
})

describe('trainee action instrumentation (PLAN 12d)', () => {
  it('reports the BP button press as its own event, before any reading exists', () => {
    // The evaluator grades ordering, so the moment the trainee reached for the
    // cuff is the fact that matters -- the reading lands ~11s later.
    sendActiveBp(118, 76)
    const onStudentEvent = renderMonitor()

    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))

    expect(onStudentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'nibp_start',
        payload: expect.objectContaining({ mode: 'manual' }),
      }),
    )
    expect(kindsFrom(onStudentEvent)).not.toContain('nibp_result')
  })

  it('reports the resulting reading with the values the trainee saw', () => {
    sendActiveBp(82, 48)
    vi.useFakeTimers()
    const onStudentEvent = vi.fn()

    render(<MonitorPage onStudentEvent={onStudentEvent} />)
    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))
    vi.advanceTimersByTime(30_000)

    expect(onStudentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'nibp_result',
        payload: { bp_sys: 82, bp_dia: 48 },
      }),
    )
    vi.useRealTimers()
  })

  it.each([
    ['Power On', 'power_on'],
    ['Power Off', 'power_off'],
    ['12-Lead', 'twelve_lead'],
    ['Capture 12-Lead', 'twelve_lead_capture'],
    ['Print', 'print'],
    ['Treatment', 'treatment_menu'],
    ['Patient Info', 'patient_info'],
  ])('reports %s as kind %s', (button, kind) => {
    const onStudentEvent = renderMonitor()

    fireEvent.click(screen.getByRole('button', { name: button }))

    expect(onStudentEvent).toHaveBeenCalledWith(expect.objectContaining({ kind }))
  })

  it('reports the EtCO2 toggle in both directions', () => {
    const onStudentEvent = renderMonitor()
    const toggle = screen.getByRole('button', { name: 'Toggle EtCO2' })

    fireEvent.click(toggle)
    expect(onStudentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'etco2_toggle', payload: { on: true } }),
    )

    fireEvent.click(toggle)
    expect(onStudentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'etco2_toggle', payload: { on: false } }),
    )
  })

  it('reports an energy change with both the old and the new value', () => {
    const onStudentEvent = renderMonitor()

    fireEvent.click(screen.getByRole('button', { name: 'Energy Up' }))

    const call = onStudentEvent.mock.calls
      .map(([event]) => event)
      .find((event) => event.kind === 'energy_change')
    expect(call).toBeDefined()
    const { from, to } = call.payload as { from: number; to: number }
    expect(to).toBeGreaterThan(from)
  })

  it('never steps energy below the floor when reporting a decrease', () => {
    const onStudentEvent = renderMonitor()
    const down = screen.getByRole('button', { name: 'Energy Down' })

    for (let press = 0; press < 20; press += 1) fireEvent.click(down)

    const changes = onStudentEvent.mock.calls
      .map(([event]) => event)
      .filter((event) => event.kind === 'energy_change')
    expect(changes.length).toBeGreaterThan(0)
    for (const change of changes) {
      expect((change.payload as { to: number }).to).toBeGreaterThan(0)
    }
  })

  it('only emits kinds the database will accept', () => {
    sendActiveBp(118, 76)
    const onStudentEvent = renderMonitor()

    for (const name of [
      'Power On',
      '12-Lead',
      'Capture 12-Lead',
      'Print',
      'Treatment',
      'Patient Info',
      'Toggle EtCO2',
      'Energy Up',
      'Energy Down',
      'Patient event',
      'Power Off',
    ]) {
      fireEvent.click(screen.getByRole('button', { name }))
    }

    expect(onStudentEvent).toHaveBeenCalled()
    for (const kind of kindsFrom(onStudentEvent)) {
      expect(STUDENT_EVENT_KINDS).toContain(kind)
    }
  })

  it('does not throw when no instructor is listening', () => {
    render(<MonitorPage />)

    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Power On' })),
    ).not.toThrow()
  })
})
