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

  it('aligns graph controls beside the matching admin vital rows', () => {
    render(<VitalsControls />)

    const fcRow = screen.getByTestId('admin-vital-row-fc')
    const ecgRow = screen.getByTestId('admin-graph-row-ecg')
    const spo2Row = screen.getByTestId('admin-vital-row-spo2')
    const spo2GraphRow = screen.getByTestId('admin-graph-row-spo2')
    const etco2Row = screen.getByTestId('admin-vital-row-etco2')
    const etco2GraphRow = screen.getByTestId('admin-graph-row-etco2')

    expect(within(fcRow).getByLabelText('FC')).toBeInTheDocument()
    expect(within(ecgRow).getByRole('heading', { name: 'ECG' })).toBeInTheDocument()
    expect(within(spo2Row).getByLabelText('SpO2')).toBeInTheDocument()
    expect(within(spo2GraphRow).getByRole('heading', { name: 'SpO2' })).toBeInTheDocument()
    expect(within(etco2Row).getByLabelText('EtCO2')).toBeInTheDocument()
    expect(within(etco2GraphRow).getByRole('heading', { name: 'EtCO2' })).toBeInTheDocument()
  })

  it('uses the shared Off/On toggle for ECG, SpO2, and EtCO2 graph controls', async () => {
    const user = userEvent.setup()
    render(<VitalsControls />)

    await user.click(
      within(screen.getByTestId('admin-graph-row-ecg')).getByRole('button', {
        name: 'ECG off',
      }),
    )
    await user.click(
      within(screen.getByTestId('admin-graph-row-spo2')).getByRole('button', {
        name: 'SpO2 off',
      }),
    )
    await user.click(
      within(screen.getByTestId('admin-graph-row-etco2')).getByRole('button', {
        name: 'EtCO2 off',
      }),
    )

    expect(useMonitorStore.getState().draft.rhythm).toBe('nsr')
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('normal')
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
    expect(state.confirmed.hr).toBe(180)
  })
})
