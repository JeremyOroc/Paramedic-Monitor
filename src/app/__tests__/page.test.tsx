import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
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
    meds,
    audio,
  }: {
    screen: ReactNode
    defib: { onAnalyse: () => void }
    softKeys: {
      onLeftAnalyse: () => void
      onToggleEtco2: () => void
      onTreatment: () => void
    }
    nav: { onMoveUp: () => void; onMoveDown: () => void; onEnter: () => void }
    meds?: {
      onMedClick?: (name: string) => void
      onMedInfo?: () => void
    }
    audio?: { onPatientEvent?: () => void }
  }) => (
    <div data-testid="device-shell">
      {screen}
      <button type="button" onClick={defib.onAnalyse}>
        Analyze rhythm
      </button>
      <button type="button" onClick={softKeys.onLeftAnalyse}>
        Call Info (sidebar)
      </button>
      <button type="button" onClick={softKeys.onToggleEtco2}>
        Toggle EtCO2
      </button>
      <button type="button" onClick={softKeys.onTreatment}>
        Treatment
      </button>
      <button type="button" onClick={() => meds?.onMedClick?.('O2')}>
        Administer O2
      </button>
      <button type="button" onClick={meds?.onMedInfo}>
        Med Info
      </button>
      <button type="button" onClick={audio?.onPatientEvent}>
        Patient event
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
    secondaryChannel,
    etco2Loading,
  }: {
    showAllSecondaryChannels?: boolean
    rhythm?: string
    spo2Waveform?: string
    etco2Waveform?: string
    secondaryChannel?: string
    etco2Loading?: boolean
  }) => (
    <div>
      Waveform panel
      <span>{secondaryChannel === 'etco2' ? 'showing-etco2' : 'showing-spo2'}</span>
      <span>{rhythm !== 'off' ? 'live-ecg' : 'disconnected-ecg'}</span>
      <span>{spo2Waveform !== 'off' ? 'live-spo2' : 'disconnected-spo2'}</span>
      <span>{etco2Waveform !== 'off' ? 'live-etco2' : 'disconnected-etco2'}</span>
      {etco2Loading && <span>etco2-loading</span>}
      {showAllSecondaryChannels && <span>expanded-waveforms</span>}
    </div>
  ),
}))

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    useMonitorStore.getState().reset()
    window.history.pushState({}, '', '/?dev=1') // bypass the dispatch lock gate
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(screen.queryByRole('heading', { name: 'New Assignment' })).not.toBeInTheDocument()
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

    expect(screen.getByRole('heading', { name: 'New Assignment' })).toBeInTheDocument()
    expect(screen.getAllByText('456 Avenue Centrale').length).toBeGreaterThan(0)
    expect(screen.getByText('Difficultes respiratoires')).toBeInTheDocument()
  })

  it('shows caller info as a full-page dispatch tablet before arrival', () => {
    window.history.pushState({}, '', '/')
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '456 Avenue Centrale')
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Difficultes respiratoires')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.queryByTestId('device-shell')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Caller info')).toHaveClass('fixed', 'inset-0')
    expect(screen.getByRole('heading', { name: 'New Assignment' })).toBeInTheDocument()
    expect(screen.getAllByText('456 Avenue Centrale').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Back to monitor' })).not.toBeInTheDocument()
  })

  it('stays on the dispatch tablet after arrival until Go to Monitor is tapped', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '456 Avenue Centrale')
      store.save()
      store.send()
      store.acknowledgeCall('14:05:00')
      store.arriveCall('14:06:00')
    })

    render(<MonitorPage />)

    // No auto-switch: the dispatch tablet is still up, now with the opt-in button.
    expect(screen.queryByTestId('device-shell')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New Assignment' })).toBeInTheDocument()
    const goToMonitor = screen.getByRole('button', { name: 'Go to monitor' })
    expect(goToMonitor).toBeEnabled()
    // The familiar Back button returns once the gate is satisfied.
    expect(screen.getByRole('button', { name: 'Back to monitor' })).toBeInTheDocument()

    await user.click(goToMonitor)

    expect(screen.getByTestId('device-shell')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'New Assignment' })).not.toBeInTheDocument()
  })

  it('requires Go to Monitor again after a full drill reset', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', 'First scenario')
      store.save()
      store.send()
      store.acknowledgeCall('14:05:00')
      store.arriveCall('14:06:00')
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Go to monitor' }))
    expect(screen.getByTestId('device-shell')).toBeInTheDocument()

    act(() => {
      useMonitorStore.getState().reset()
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', 'Second scenario')
      store.save()
      store.send()
      store.acknowledgeCall('15:05:00')
      store.arriveCall('15:06:00')
    })

    expect(screen.queryByTestId('device-shell')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New Assignment' })).toBeInTheDocument()
    expect(screen.getAllByText('Second scenario').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Go to monitor' })).toBeEnabled()
  })

  it('disables Go to Monitor before arrival completes the gate', () => {
    window.history.pushState({}, '', '/')
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '456 Avenue Centrale')
      store.save()
      store.send()
    })

    render(<MonitorPage />)

    expect(screen.getByRole('button', { name: 'Go to monitor' })).toBeDisabled()
  })

  it('opens caller info from the monitor as a full-page tablet with Back', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '456 Avenue Centrale')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Call Info (sidebar)' }))

    expect(screen.getByLabelText('Caller info')).toHaveClass('fixed', 'inset-0')
    expect(screen.getByRole('button', { name: 'Back to monitor' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to monitor' }))

    expect(screen.queryByRole('heading', { name: 'New Assignment' })).not.toBeInTheDocument()
  })

  it('offers an enabled Go to Monitor button when caller info is opened from the monitor', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '456 Avenue Centrale')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Call Info (sidebar)' }))

    const goToMonitor = screen.getByRole('button', { name: 'Go to monitor' })
    expect(goToMonitor).toBeEnabled()

    await user.click(goToMonitor)

    expect(screen.queryByRole('heading', { name: 'New Assignment' })).not.toBeInTheDocument()
  })

  it('can show the classic caller info variant for A/B comparison', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/?dev=1&callerInfoVariant=classic')
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '456 Avenue Centrale')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Call Info (sidebar)' }))

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'New Assignment' })).not.toBeInTheDocument()
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

  it('holds sent BP values until a full NIBP reading completes', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('hr', 150)
      useMonitorStore.getState().setDraft('bp_sys', 110)
      useMonitorStore.getState().setDraft('bp_dia', 70)
      useMonitorStore.getState().setDraft('spo2', 97)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.queryByText('110')).not.toBeInTheDocument()
    expect(screen.queryByText('70')).not.toBeInTheDocument()
    expect(screen.getByText('97')).toBeInTheDocument()
    expect(screen.getByText('disconnected-ecg')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))
    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 100) })

    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
    expect(useMonitorStore.getState().acceptedBp).toEqual({ bp_sys: 110, bp_dia: 70 })
    vi.useRealTimers()
  })

  it('shows both BP numbers after a completed partial-active NIBP reading', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('bp_sys', 130)
      useMonitorStore.getState().setDraft('bp_dia', 85)
      useMonitorStore.getState().setDraftVitalActive('bp_sys', false)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))
    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 100) })

    expect(screen.getByText('130')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(useMonitorStore.getState().acceptedBpActive).toEqual({
      bp_sys: false,
      bp_dia: true,
    })
    vi.useRealTimers()
  })

  it('keeps old BP when the NIBP reading is cancelled', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('bp_sys', 160)
      useMonitorStore.getState().setDraft('bp_dia', 100)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))
    act(() => { vi.advanceTimersByTime(3000) })
    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))

    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.queryByText('160')).not.toBeInTheDocument()
    expect(useMonitorStore.getState().acceptedBp).toEqual({ bp_sys: 120, bp_dia: 80 })
    vi.useRealTimers()
  })

  it('holds pending BP Off until a completed NIBP reading blanks PNI', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraftVitalActive('bp_sys', false)
      useMonitorStore.getState().setDraftVitalActive('bp_dia', false)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))
    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 100) })

    expect(useMonitorStore.getState().acceptedBpActive).toEqual({ bp_sys: false, bp_dia: false })
    const vitalValues = screen.getAllByTestId('vital-value').map((node) => node.textContent)
    expect(vitalValues[1]).toBe('')
    vi.useRealTimers()
  })

  it('uses the BP snapshot from reading start even if admin sends another BP mid-read', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('bp_sys', 150)
      useMonitorStore.getState().setDraft('bp_dia', 90)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))

    act(() => {
      useMonitorStore.getState().setDraft('bp_sys', 170)
      useMonitorStore.getState().setDraft('bp_dia', 110)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
      vi.advanceTimersByTime(3000 + 500 + 8000 + 100)
    })

    expect(useMonitorStore.getState().acceptedBp).toEqual({ bp_sys: 150, bp_dia: 90 })
    vi.useRealTimers()
  })

  it('uses accepted BP, not pending BP, for alarm state', () => {
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('bp_sys', 220)
      useMonitorStore.getState().setDraft('bp_dia', 230)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
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

  it('shows EtCO2 loading on first toggle and only marks it loaded after 8 seconds', () => {
    vi.useFakeTimers()
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.getByText('showing-etco2')).toBeInTheDocument()
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(7999) })
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.queryByText('etco2-loading')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.queryByText('etco2-loading')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('restarts EtCO2 loading if toggled away before completion', () => {
    vi.useFakeTimers()
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    act(() => { vi.advanceTimersByTime(3000) })
    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.queryByText('etco2-loading')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(7999) })
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('makes EtCO2 load again after monitor reset', () => {
    vi.useFakeTimers()
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    act(() => { vi.advanceTimersByTime(8000) })
    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.queryByText('etco2-loading')).not.toBeInTheDocument()

    act(() => useMonitorStore.getState().resetMonitorVitals())
    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('stamps medication events with real Eastern time instead of session time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T18:30:45Z'))
    render(<MonitorPage />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Treatment' }))
      fireEvent.click(screen.getByRole('button', { name: 'Administer O2' }))
      fireEvent.click(screen.getByRole('button', { name: 'Med Info' }))
    })

    expect(screen.getAllByText('O2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('13:30:45').length).toBeGreaterThan(0)
    expect(screen.queryByText('00:00')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('stamps analyze event rows with real Eastern time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T18:30:45Z'))
    act(() => {
      useMonitorStore.getState().setDraft('rhythm', 'nsr')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })
    render(<MonitorPage />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Analyze rhythm' }))
    })
    act(() => { vi.advanceTimersByTime(5000) })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Med Info' }))
    })

    expect(screen.getByText('Analyze - No Shock')).toBeInTheDocument()
    expect(screen.getAllByText('13:30:50').length).toBeGreaterThan(0)
    vi.useRealTimers()
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
