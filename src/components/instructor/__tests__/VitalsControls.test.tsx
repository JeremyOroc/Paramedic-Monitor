import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'
import { DEFAULT_VITALS } from '@/types/vitals'

import { VitalsControls } from '../VitalsControls'

describe('VitalsControls', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('renders a Normal button at the top of the vitals panel', () => {
    render(<VitalsControls />)

    const heading = screen.getByRole('heading', { name: 'Vitals' })
    const normal = screen.getByRole('button', { name: 'Set vitals to normal' })
    expect(heading.compareDocumentPosition(normal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByLabelText('Auto-sort vitals')).toBeInTheDocument()
  })

  it('orders admin vitals as FC, SpO2, BP, EtCO2', () => {
    render(<VitalsControls />)

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
    render(<VitalsControls />)

    const fcRow = screen.getByTestId('admin-vital-row-fc')
    const ecgRow = screen.getByTestId('admin-graph-row-ecg')
    const spo2Row = screen.getByTestId('admin-vital-row-spo2')
    const etco2Row = screen.getByTestId('admin-vital-row-etco2')

    expect(within(fcRow).getByLabelText('FC')).toBeInTheDocument()
    expect(within(ecgRow).getByRole('heading', { name: 'ECG' })).toBeInTheDocument()
    expect(within(spo2Row).getByLabelText('SpO2')).toBeInTheDocument()
    expect(within(etco2Row).getByLabelText('EtCO2')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-spo2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-etco2')).not.toBeInTheDocument()
  })

  it('keeps ECG as the only right-side graph control', async () => {
    const user = userEvent.setup()
    render(<VitalsControls />)

    await user.click(
      within(screen.getByTestId('admin-graph-row-ecg')).getByRole('button', {
        name: 'ECG off',
      }),
    )

    expect(useMonitorStore.getState().draft.rhythm).toBe('nsr')
  })

  it('uses left-side SpO2 and EtCO2 toggles to stage graph connection state', async () => {
    const user = userEvent.setup()
    render(<VitalsControls />)

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

  it('auto-sorts labelled vitals into draft values and activates them', async () => {
    const user = userEvent.setup()
    render(<VitalsControls />)

    await user.type(
      screen.getByLabelText('Auto-sort vitals'),
      [
        'FC: 120',
        'SpO2: 96',
        'BP: 186/102',
        'EtCO2: 35',
      ].join('\n'),
    )

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(120)
    expect(state.draft.spo2).toBe(96)
    expect(state.draft.bp_sys).toBe(186)
    expect(state.draft.bp_dia).toBe(102)
    expect(state.draft.etco2).toBe(35)
    expect(state.draftVitalActive).toMatchObject({
      hr: true,
      spo2: true,
      bp_sys: true,
      bp_dia: true,
      etco2: true,
    })
  })

  it('auto-sort leaves missing labels unchanged', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraft('hr', 80)
    useMonitorStore.getState().setDraft('bp_sys', 120)
    useMonitorStore.getState().setDraft('bp_dia', 80)
    render(<VitalsControls />)

    await user.type(screen.getByLabelText('Auto-sort vitals'), 'SpO2: 93')

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(80)
    expect(state.draft.bp_sys).toBe(120)
    expect(state.draft.bp_dia).toBe(80)
    expect(state.draft.spo2).toBe(93)
  })

  it('auto-sorted SpO2 and EtCO2 values stage matching graph connection state', async () => {
    const user = userEvent.setup()
    render(<VitalsControls />)

    await user.type(
      screen.getByLabelText('Auto-sort vitals'),
      [
        'Saturation: 90',
        'CO2: 28',
      ].join('\n'),
    )

    const state = useMonitorStore.getState()
    expect(state.draft.spo2).toBe(90)
    expect(state.draft.spo2_waveform).toBe('normal')
    expect(state.draftVitalActive.spo2).toBe(true)
    expect(state.draft.etco2).toBe(28)
    expect(state.draft.etco2_waveform).toBe('normal')
    expect(state.draftVitalActive.etco2).toBe(true)
  })

  it('auto-sort supports separate BP systolic and diastolic labels', async () => {
    const user = userEvent.setup()
    render(<VitalsControls />)

    await user.type(
      screen.getByLabelText('Auto-sort vitals'),
      [
        'BP sys: 140',
        'BP dia: 90',
      ].join('\n'),
    )

    const state = useMonitorStore.getState()
    expect(state.draft.bp_sys).toBe(140)
    expect(state.draft.bp_dia).toBe(90)
    expect(state.draftVitalActive.bp_sys).toBe(true)
    expect(state.draftVitalActive.bp_dia).toBe(true)
  })

  it('resets draft vital numbers to normal defaults without sending them', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraft('hr', 180)
    useMonitorStore.getState().setDraft('bp_sys', 230)
    useMonitorStore.getState().setDraft('bp_dia', 240)
    useMonitorStore.getState().setDraft('spo2', 82)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().setDraft('hr', 185)

    render(<VitalsControls />)
    await user.click(screen.getByRole('button', { name: 'Set vitals to normal' }))

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(DEFAULT_VITALS.hr)
    expect(state.draft.bp_sys).toBe(DEFAULT_VITALS.bp_sys)
    expect(state.draft.bp_dia).toBe(DEFAULT_VITALS.bp_dia)
    expect(state.draft.spo2).toBe(DEFAULT_VITALS.spo2)
    expect(state.draftVitalActive).toEqual({
      hr: true,
      bp_sys: true,
      bp_dia: true,
      etco2: true,
      spo2: true,
    })
    expect(state.draft.spo2_waveform).toBe('normal')
    expect(state.draft.etco2_waveform).toBe('normal')
    expect(state.confirmed.hr).toBe(180)
  })
})
