import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { PatientSnsMeasurementState } from '@/hooks/usePatientSnsMeasurements'
import { useMonitorStore } from '@/store/monitorStore'

import { VitalsControls } from '../VitalsControls'

const TIMED_VITALS_SAMPLE = [
  'Treated (+5 min)',
  'Pulse: 106 bpm, Regular, Moderate',
  'SpO2: 98% on O2',
  'BP: 112/70 mmHg',
  'Respirations: 22 breaths/min, Regular, Unlabored',
  'Temp: 36.3C',
  'EtCO2: 36 mmHg',
  'Update: Bleeding controlled with dressing, mentation unchanged.',
  '',
  'Treated (+10 min)',
  'Pulse: 100 bpm, Regular, Moderate',
  'SpO2: 99% on O2',
  'BP: 118/74 mmHg',
  'Respirations: 20 breaths/min, Regular, Unlabored',
  'Temp: 36.4C',
  'EtCO2: 38 mmHg',
  '',
  'Untreated (+15 min)',
  'Pulse: 136 bpm, Regular, Thready',
  'SpO2: 92% on room air',
  'BP: 76/46 mmHg',
  'Respirations: 30 breaths/min, Irregular, Weak respiratory effort',
  'Temp: 36.0C',
  'EtCO2: 26 mmHg',
].join('\n')

const EMPTY_MEASUREMENTS: PatientSnsMeasurementState = {
  pulse: {
    durationSeconds: null,
    endsAt: null,
    pendingSnapshot: null,
    resultSnapshot: null,
    secondsLeft: 0,
  },
  respiratory: {
    durationSeconds: null,
    endsAt: null,
    pendingSnapshot: null,
    resultSnapshot: null,
    secondsLeft: 0,
  },
}

describe('VitalsControls', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('renders the Vitals heading without Normal or a local auto-sort textarea', () => {
    render(<VitalsControls autoSortText="" />)

    expect(screen.getByRole('heading', { name: 'Vitals' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set vitals to normal' })).toBeNull()
    expect(screen.queryByLabelText('Auto-sort vitals')).toBeNull()
  })

  it('renders Pulse, Respiratory, and Skin/Extremities horizontally inside Vitals', () => {
    render(
      <VitalsControls
        autoSortText=""
        patientSns={{
          selected: new Set<string>(),
          findings: {},
          activeIconGroup: null,
          onIconGroupClick: vi.fn(),
          measurements: EMPTY_MEASUREMENTS,
          onMeasurementStart: vi.fn(),
          onMeasurementTap: vi.fn(),
          onMeasurementCancel: vi.fn(),
        }}
      />,
    )

    const controls = screen.getByTestId('patient-sns-controls')
    const pulse = within(controls).getByRole('heading', { name: 'Pulse' })
    const respiratory = within(controls).getByRole('heading', { name: 'Respiratory' })
    const skinExtremities = within(controls).getByRole('button', {
      name: 'Skin/Extremities',
    })

    expect(controls).toHaveClass('grid', 'grid-cols-3')
    expect(pulse.compareDocumentPosition(respiratory)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(respiratory.compareDocumentPosition(skinExtremities)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(within(controls).queryByRole('button', { name: 'Scene/Environment' })).toBeNull()
  })

  it('orders admin vitals as FC, SpO2, BP, EtCO2', () => {
    render(<VitalsControls autoSortText="" />)

    const fc = screen.getByLabelText('FC')
    const spo2 = screen.getByLabelText('SpO2')
    const bpSys = screen.getByLabelText('BP sys')
    const bpDia = screen.getByLabelText('BP dia')
    const etco2 = screen.getByLabelText('EtCO2')

    expect(fc.compareDocumentPosition(spo2)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(spo2.compareDocumentPosition(bpSys)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(bpSys.compareDocumentPosition(bpDia)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(bpDia.compareDocumentPosition(etco2)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('keeps ECG beside FC and removes SpO2/EtCO2 right-side graph controls', () => {
    render(<VitalsControls autoSortText="" />)

    const vitalsColumn = screen.getByTestId('admin-vitals-column')
    const ecgColumn = screen.getByTestId('admin-ecg-column')
    const fcRow = screen.getByTestId('admin-vital-row-fc')
    const ecgRow = screen.getByTestId('admin-graph-row-ecg')
    const spo2Row = screen.getByTestId('admin-vital-row-spo2')
    const bpSysRow = screen.getByTestId('admin-vital-row-bp-sys')
    const bpDiaRow = screen.getByTestId('admin-vital-row-bp-dia')
    const etco2Row = screen.getByTestId('admin-vital-row-etco2')

    expect(vitalsColumn).toHaveClass('flex', 'flex-col', 'gap-2', 'min-w-0')
    expect(ecgColumn).toHaveClass('self-start', 'min-w-0')
    expect(vitalsColumn).toContainElement(fcRow)
    expect(vitalsColumn).toContainElement(spo2Row)
    expect(vitalsColumn).toContainElement(bpSysRow)
    expect(vitalsColumn).toContainElement(bpDiaRow)
    expect(vitalsColumn).toContainElement(etco2Row)
    expect(ecgColumn).toContainElement(ecgRow)
    expect(within(fcRow).getByLabelText('FC')).toBeInTheDocument()
    expect(within(ecgRow).getByRole('heading', { name: 'ECG' })).toBeInTheDocument()
    expect(within(ecgRow).getByRole('heading', { name: 'ECG' }).closest('section')).not.toHaveClass(
      'h-full',
    )
    expect(within(spo2Row).getByLabelText('SpO2')).toBeInTheDocument()
    expect(within(etco2Row).getByLabelText('EtCO2')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-spo2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-etco2')).not.toBeInTheDocument()
  })

  it('renders timed vitals buttons under the ECG control', () => {
    render(<VitalsControls autoSortText="" />)

    const timedVitals = screen.getByLabelText('Timed vitals')
    expect(timedVitals).toHaveClass(
      'relative',
      'z-10',
      'grid',
      'grid-cols-3',
      'grid-rows-2',
    )

    for (const name of ['T1', 'T2', 'T3', 'U1', 'U2', 'U3']) {
      expect(within(timedVitals).getByRole('button', { name })).toHaveClass(
        'relative',
        'z-10',
        'w-full',
        'h-11',
        'min-h-11',
        'cursor-pointer',
        'appearance-none',
        'pointer-events-auto',
        'px-2',
        'py-2',
        'text-xs',
      )
    }
  })

  it('keeps ECG as the only right-side graph control', async () => {
    const user = userEvent.setup()
    render(<VitalsControls autoSortText="" />)

    await user.click(
      within(screen.getByTestId('admin-graph-row-ecg')).getByRole('button', {
        name: 'ECG off',
      }),
    )

    expect(useMonitorStore.getState().draft.rhythm).toBe('nsr')
  })

  it('uses left-side SpO2 and EtCO2 toggles to stage graph connection state', async () => {
    const user = userEvent.setup()
    render(<VitalsControls autoSortText="" />)

    await user.click(screen.getByRole('button', { name: 'SpO2 off' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 off' }))

    expect(useMonitorStore.getState().draftVitalActive.spo2).toBe(true)
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().draftVitalActive.etco2).toBe(true)
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('normal')

    await user.click(screen.getByRole('button', { name: 'SpO2 on' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 on' }))

    expect(useMonitorStore.getState().draftVitalActive.spo2).toBe(false)
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('off')
    expect(useMonitorStore.getState().draftVitalActive.etco2).toBe(false)
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('off')
  })

  it('shows the EtCO2 calibration indicator as neutral until calibration completes', () => {
    render(<VitalsControls autoSortText="" />)

    const indicator = screen.getByTestId('admin-etco2-calibration-indicator')
    expect(indicator).toHaveAttribute('data-calibrated', 'false')
    expect(indicator).toHaveClass('border-neutral-700', 'text-neutral-600')

    act(() => {
      useMonitorStore.getState().startEtco2Calibration()
      useMonitorStore.getState().completeEtco2Calibration()
    })

    expect(indicator).toHaveAttribute('data-calibrated', 'true')
    expect(indicator).toHaveClass('border-purple-etco2', 'text-purple-etco2')

    act(() => useMonitorStore.getState().resetMonitorVitals())

    expect(indicator).toHaveAttribute('data-calibrated', 'false')
  })

  it('lights the EtCO2 indicator from session state, not the local store', () => {
    // In a session, calibration happens on the trainee's monitor and only
    // reaches the instructor through the student-event stream — the local
    // store's own status stays idle forever, which is why this box never lit.
    const { rerender } = render(
      <VitalsControls autoSortText="" sessionEtco2Calibrated={false} />,
    )

    const indicator = screen.getByTestId('admin-etco2-calibration-indicator')
    expect(indicator).toHaveAttribute('data-calibrated', 'false')

    rerender(<VitalsControls autoSortText="" sessionEtco2Calibrated />)

    expect(indicator).toHaveAttribute('data-calibrated', 'true')
    expect(indicator).toHaveClass('border-purple-etco2', 'text-purple-etco2')
  })

  it('ignores the local store status when session state is supplied', () => {
    render(<VitalsControls autoSortText="" sessionEtco2Calibrated={false} />)

    act(() => {
      useMonitorStore.getState().startEtco2Calibration()
      useMonitorStore.getState().completeEtco2Calibration()
    })

    // The instructor calibrating nothing locally must not light the box.
    expect(screen.getByTestId('admin-etco2-calibration-indicator')).toHaveAttribute(
      'data-calibrated',
      'false',
    )
  })

  it('toggles and directly switches mutually exclusive CPR modes', async () => {
    const user = userEvent.setup()
    render(<VitalsControls autoSortText="" />)

    const group = screen.getByRole('group', { name: 'CPR mode' })
    const regular = within(group).getByRole('button', { name: 'Regular CPR' })
    const weak = within(group).getByRole('button', { name: 'Weak CPR' })
    expect(group).toHaveClass('grid-cols-2')
    expect(regular).toHaveAttribute('aria-pressed', 'false')
    expect(weak).toHaveAttribute('aria-pressed', 'false')
    expect(useMonitorStore.getState().cprMode).toBe('off')

    await user.click(regular)

    expect(regular).toHaveAttribute('aria-pressed', 'true')
    expect(weak).toHaveAttribute('aria-pressed', 'false')
    expect(regular).toHaveClass('border-ecg-green')
    expect(useMonitorStore.getState().cprMode).toBe('regular')

    await user.click(weak)

    expect(regular).toHaveAttribute('aria-pressed', 'false')
    expect(weak).toHaveAttribute('aria-pressed', 'true')
    expect(useMonitorStore.getState().cprMode).toBe('weak')

    await user.click(weak)

    expect(regular).toHaveAttribute('aria-pressed', 'false')
    expect(weak).toHaveAttribute('aria-pressed', 'false')
    expect(useMonitorStore.getState().cprMode).toBe('off')
  })

  it('stages T1 timed vital numbers without turning initially off vitals on', async () => {
    const user = userEvent.setup()
    render(<VitalsControls autoSortText={TIMED_VITALS_SAMPLE} />)

    await user.click(screen.getByRole('button', { name: 'T1' }))

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(106)
    expect(state.draft.spo2).toBe(98)
    expect(state.draft.bp_sys).toBe(112)
    expect(state.draft.bp_dia).toBe(70)
    expect(state.draft.etco2).toBe(36)
    expect(state.draftVitalActive).toEqual({
      hr: false,
      bp_sys: false,
      bp_dia: false,
      etco2: false,
      spo2: false,
    })
    expect(state.draft.spo2_waveform).toBe('off')
    expect(state.draft.etco2_waveform).toBe('off')
  })

  it('notifies the admin page when a timed vitals button is clicked', async () => {
    const user = userEvent.setup()
    const onTimedVitalsClick = vi.fn()
    render(
      <VitalsControls
        autoSortText={TIMED_VITALS_SAMPLE}
        onTimedVitalsClick={onTimedVitalsClick}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'T1' }))

    expect(onTimedVitalsClick).toHaveBeenCalledWith('T1')
    expect(useMonitorStore.getState().draft.hr).toBe(106)
  })

  it('stages U3 timed vital numbers without reconnecting inactive graphs', async () => {
    const user = userEvent.setup()
    render(<VitalsControls autoSortText={TIMED_VITALS_SAMPLE} />)

    await user.click(screen.getByRole('button', { name: 'U3' }))

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(136)
    expect(state.draft.spo2).toBe(92)
    expect(state.draft.bp_sys).toBe(76)
    expect(state.draft.bp_dia).toBe(46)
    expect(state.draft.etco2).toBe(26)
    expect(state.draftVitalActive.spo2).toBe(false)
    expect(state.draftVitalActive.etco2).toBe(false)
    expect(state.draft.spo2_waveform).toBe('off')
    expect(state.draft.etco2_waveform).toBe('off')
  })

  it('keeps already-on SpO2 and EtCO2 graphs connected when applying timed vitals', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    useMonitorStore.getState().setDraftVitalActive('etco2', true)
    render(<VitalsControls autoSortText={TIMED_VITALS_SAMPLE} />)

    await user.click(screen.getByRole('button', { name: 'T2' }))

    const state = useMonitorStore.getState()
    expect(state.draft.spo2).toBe(99)
    expect(state.draft.etco2).toBe(38)
    expect(state.draftVitalActive.spo2).toBe(true)
    expect(state.draftVitalActive.etco2).toBe(true)
    expect(state.draft.spo2_waveform).toBe('normal')
    expect(state.draft.etco2_waveform).toBe('normal')
  })

  it('keeps SpO2 and EtCO2 off when switching timed vitals after they were turned off', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    useMonitorStore.getState().setDraftVitalActive('etco2', true)
    render(<VitalsControls autoSortText={TIMED_VITALS_SAMPLE} />)

    await user.click(screen.getByRole('button', { name: 'T1' }))
    act(() => {
      useMonitorStore.getState().setDraftVitalActive('spo2', false)
      useMonitorStore.getState().setDraftVitalActive('etco2', false)
    })
    await user.click(screen.getByRole('button', { name: 'T2' }))

    const state = useMonitorStore.getState()
    expect(state.draft.spo2).toBe(99)
    expect(state.draft.etco2).toBe(38)
    expect(state.draftVitalActive.spo2).toBe(false)
    expect(state.draftVitalActive.etco2).toBe(false)
    expect(state.draft.spo2_waveform).toBe('off')
    expect(state.draft.etco2_waveform).toBe('off')
  })

  it('leaves existing draft values unchanged when a timed section is missing', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraft('hr', 80)
    useMonitorStore.getState().setDraft('spo2', 95)
    render(<VitalsControls autoSortText={TIMED_VITALS_SAMPLE} />)
    const beforeClick = { ...useMonitorStore.getState().draft }

    await user.click(screen.getByRole('button', { name: 'T3' }))

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(beforeClick.hr)
    expect(state.draft.spo2).toBe(beforeClick.spo2)
    expect(state.draft.bp_sys).toBe(beforeClick.bp_sys)
    expect(state.draft.bp_dia).toBe(beforeClick.bp_dia)
    expect(state.draft.etco2).toBe(beforeClick.etco2)
  })

})
