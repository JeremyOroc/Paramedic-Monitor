import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { useMonitorStore } from '@/store/monitorStore'

import MonitorPage from '../page'

vi.mock('@/components/monitor/DeviceShell', () => ({
  DeviceShell: ({
    screen,
    defib,
    softKeys,
    nav,
  }: {
    screen: ReactNode
    defib: { onAnalyse: () => void }
    softKeys: { onLeftAnalyse: () => void }
    nav: { onMoveUp: () => void; onMoveDown: () => void; onEnter: () => void }
  }) => (
    <div>
      {screen}
      <button type="button" onClick={defib.onAnalyse}>
        Analyze rhythm
      </button>
      <button type="button" onClick={softKeys.onLeftAnalyse}>
        Call Info (sidebar)
      </button>
      <button type="button" onClick={nav.onMoveUp}>
        Move up
      </button>
      <button type="button" onClick={nav.onMoveDown}>
        Move down
      </button>
      <button type="button" onClick={nav.onEnter}>
        Enter
      </button>
    </div>
  ),
}))

vi.mock('@/components/monitor/WaveformPanel', () => ({
  WaveformPanel: ({
    showAllSecondaryChannels,
    rhythm,
    spo2Waveform,
    etco2Waveform,
  }: {
    showAllSecondaryChannels?: boolean
    rhythm?: string
    spo2Waveform?: string
    etco2Waveform?: string
  }) => (
    <div>
      Waveform panel
      <span>{rhythm !== 'off' ? 'live-ecg' : 'disconnected-ecg'}</span>
      <span>{spo2Waveform !== 'off' ? 'live-spo2' : 'disconnected-spo2'}</span>
      <span>{etco2Waveform !== 'off' ? 'live-etco2' : 'disconnected-etco2'}</span>
      {showAllSecondaryChannels && <span>expanded-waveforms</span>}
    </div>
  ),
}))

describe('MonitorPage', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
    window.history.pushState({}, '', '/?dev=1') // bypass the dispatch lock gate
  })

  it('does not open caller info modal when ANALYZE is clicked', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Douleur thoracique')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Analyze rhythm' }))

    expect(screen.queryByRole('heading', { name: 'Caller Info' })).not.toBeInTheDocument()
  })

  it('shows confirmed caller info when left sidebar ANALYSE is clicked', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '456 Avenue Centrale')
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Difficultes respiratoires')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Call Info (sidebar)' }))

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByText('456 Avenue Centrale')).toBeInTheDocument()
    expect(screen.getByText('Difficultes respiratoires')).toBeInTheDocument()
  })

  it('starts with date and time selected', () => {
    render(<MonitorPage />)

    expect(screen.getByLabelText('Date and time')).toHaveClass(
      'bg-[var(--color-selection-blue)]',
      'text-white',
    )
  })

  it('starts with blank disconnected vitals without active alarms', () => {
    render(<MonitorPage />)

    const vitalValues = screen.getAllByTestId('vital-value').map((node) => node.textContent)
    expect(vitalValues).toEqual(['', '', '', 'SpO2 OFF'])
    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByText('EtCO2').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByText('SpO2').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByText('disconnected-ecg')).toBeInTheDocument()
    expect(screen.getByText('disconnected-spo2')).toBeInTheDocument()
    expect(screen.getByText('disconnected-etco2')).toBeInTheDocument()
  })

  it('shows vital numbers after vitals are saved and sent while graphs remain disconnected', () => {
    act(() => {
      useMonitorStore.getState().setDraft('hr', 150)
      useMonitorStore.getState().setDraft('bp_sys', 110)
      useMonitorStore.getState().setDraft('bp_dia', 70)
      useMonitorStore.getState().setDraft('spo2', 97)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
    expect(screen.getByText('97')).toBeInTheDocument()
    expect(screen.getByText('disconnected-ecg')).toBeInTheDocument()
  })

  it('distinguishes inactive 0 from active 0 for alarms', () => {
    act(() => {
      useMonitorStore.getState().setDraft('hr', 0)
      useMonitorStore.getState().setDraftVitalActive('hr', false)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    const { unmount } = render(<MonitorPage />)
    expect(screen.getAllByTestId('vital-value')[0]).toHaveTextContent('')
    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'false',
    )
    unmount()

    act(() => {
      useMonitorStore.getState().setDraftVitalActive('hr', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })
    render(<MonitorPage />)

    expect(screen.getAllByTestId('vital-value')[0]).toHaveTextContent('0')
    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'true',
    )
  })

  it('can show only selected live graph channels after non-off options are saved and sent', () => {
    act(() => {
      useMonitorStore.getState().setDraft('rhythm', 'nsr')
      useMonitorStore.getState().setDraft('spo2_waveform', 'normal')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('live-ecg')).toBeInTheDocument()
    expect(screen.getByText('live-spo2')).toBeInTheDocument()
    expect(screen.getByText('disconnected-etco2')).toBeInTheDocument()
  })

  it('cycles to the bottom status toggle in reverse and hides the bottom panel on enter', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)

    expect(screen.getByText('APPL ELECT.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Move down' }))
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    expect(screen.queryByText('APPL ELECT.')).not.toBeInTheDocument()
    expect(screen.getByText('expanded-waveforms')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle bottom status panel' })).toHaveClass(
      'bg-[var(--color-selection-blue)]',
      'text-white',
    )
  })
})
