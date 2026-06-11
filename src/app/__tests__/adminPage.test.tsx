import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'

import AdminPage from '../admin/page'

describe('AdminPage', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('shows monitor controls by default and keeps caller info in its own tab', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    expect(screen.getByRole('button', { name: 'Monitor' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Vitals')).toBeInTheDocument()
    expect(within(screen.getByTestId('admin-graph-row-ecg')).getByRole('button', { name: 'ECG off' })).toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-spo2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-etco2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SpO2 off' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EtCO2 off' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Adresse')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Caller Info' }))

    expect(screen.getByRole('button', { name: 'Caller Info' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument()
    expect(screen.queryByText('Vitals')).toBeNull()
  })

  it('uses the Monitor tab Reset to clear only monitor vitals', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setDraft('hr', 180)
      useMonitorStore.getState().save()
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    const s = useMonitorStore.getState()
    expect(s.confirmedVitalsActive).toBe(false)
    expect(s.confirmed.hr).toBe(0)
    expect(s.confirmed.rhythm).toBe('off')
    expect(s.confirmed.spo2_waveform).toBe('off')
    expect(s.confirmed.etco2_waveform).toBe('off')
    expect(s.callerInfoConfirmed.address).toBe('123 Rue Principale')
    expect(s.dispatch.armed).toBe(true)
  })

  it('uses the Caller Info tab Reset to reset the full drill', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setDraft('hr', 180)
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Caller Info' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))

    const s = useMonitorStore.getState()
    expect(s.confirmedVitalsActive).toBe(false)
    expect(s.confirmed.rhythm).toBe('off')
    expect(s.callerInfoConfirmed.address).toBe('')
    expect(s.dispatch.armed).toBe(false)
  })

  it('stages SpO2 and EtCO2 graph state through the left vital toggles', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(within(screen.getByRole('heading', { name: 'ECG' }).closest('section')!).getByRole('button', { name: 'Rhythm Options' }))
    await user.click(within(screen.getByRole('heading', { name: 'ECG' }).closest('section')!).getByRole('button', { name: 'Cardiac Arrest' }))
    await user.click(within(screen.getByRole('heading', { name: 'ECG' }).closest('section')!).getByRole('button', { name: 'VF' }))
    await user.click(screen.getByRole('button', { name: 'SpO2 off' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 off' }))

    expect(useMonitorStore.getState().draft.rhythm).toBe('vf')
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('normal')
    expect(useMonitorStore.getState().draftVitalActive.spo2).toBe(true)
    expect(useMonitorStore.getState().draftVitalActive.etco2).toBe(true)
    expect(useMonitorStore.getState().draftVitalsActive).toBe(true)
    expect(screen.getByTestId('status-rhythm')).toHaveTextContent('-')
    expect(screen.getByTestId('status-spo2')).toHaveAttribute('data-status', 'dirty')
    expect(screen.getByTestId('status-etco2')).toHaveAttribute('data-status', 'dirty')
  })

  it('sends SpO2 and EtCO2 graph on/off state from the left vital toggles', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'SpO2 off' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 off' }))
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('off')
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('off')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(useMonitorStore.getState().confirmedVitalActive.spo2).toBe(true)
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().confirmedVitalActive.etco2).toBe(true)
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('normal')

    await user.click(screen.getByRole('button', { name: 'SpO2 on' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 on' }))
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('normal')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(useMonitorStore.getState().confirmedVitalActive.spo2).toBe(false)
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('off')
    expect(useMonitorStore.getState().confirmedVitalActive.etco2).toBe(false)
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('off')
  })
})
