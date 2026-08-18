import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { pauseAlarm, playAlarm, playCallerInfoAlert, stopAllAudio } from '@/lib/audio'
import { useMonitorStore } from '@/store/monitorStore'
import { ETCO2_CALIBRATION_MS } from '@/components/monitor/SecondaryChannel'

import MonitorPage from '../page'
// The default export is the route wrapper and renders MonitorPage without
// props; the session monitor page uses this named export to pass onStudentEvent.
import { MonitorPage as MonitorPageWithProps } from '../page'

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

vi.mock('@/components/monitor/DeviceShell', () => ({
  DeviceShell: ({
    screen,
    screenModal,
    defib,
    softKeys,
    nav,
    meds,
    audio,
  }: {
    screen: ReactNode
    screenModal?: ReactNode
    defib: { onAnalyse: () => void }
    softKeys: {
      onLeftAnalyse: () => void
      onToggleEtco2: () => void
      onTreatment: () => void
      onPatientInfo: () => void
      onBack: () => void
    }
    nav: {
      onHome: () => void
      onMoveUp: () => void
      onMoveDown: () => void
      onEnter: () => void
    }
    meds?: {
      onMedClick?: (name: string) => void
      onMedInfo?: () => void
    }
    audio?: { onPatientEvent?: () => void }
  }) => (
    <div data-testid="device-shell">
      {screen}
      {screenModal}
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
      <button type="button" onClick={softKeys.onPatientInfo}>
        Patient Info
      </button>
      <button type="button" onClick={softKeys.onBack}>
        Back
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
      <button type="button" onClick={nav.onHome}>
        Home
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
    secondaryChannel,
    showAllSecondaryChannels,
    rhythm,
    spo2Waveform,
    etco2Waveform,
    etco2Loading,
    cprOverride,
  }: {
    secondaryChannel?: 'spo2' | 'etco2'
    showAllSecondaryChannels?: boolean
    rhythm?: string
    spo2Waveform?: string
    etco2Waveform?: string
    etco2Loading?: boolean
    cprOverride?: boolean
  }) => {
    const selected = secondaryChannel ?? 'spo2'
    const selectedWaveform = selected === 'etco2' ? etco2Waveform : spo2Waveform
    const bothSecondaryOff = spo2Waveform === 'off' && etco2Waveform === 'off'

    return (
      <div>
        Waveform panel
        <span>
          {cprOverride ? 'cpr-ecg-canvas' : rhythm !== 'off' ? 'live-ecg' : 'disconnected-ecg'}
        </span>
        {selected === 'etco2' && <span>showing-etco2</span>}
        {showAllSecondaryChannels ? (
          <>
            <span>
              {etco2Loading
                ? 'etco2-loading'
                : etco2Waveform !== 'off'
                  ? 'live-etco2'
                  : 'disconnected-etco2'}
            </span>
            <span>{spo2Waveform !== 'off' ? 'live-spo2' : 'disconnected-spo2'}</span>
            <span>expanded-waveforms</span>
          </>
        ) : selected === 'etco2' && etco2Loading ? (
          <span>etco2-loading</span>
        ) : selectedWaveform !== 'off' ? (
          <span>{selected === 'etco2' ? 'live-etco2' : 'live-spo2'}</span>
        ) : bothSecondaryOff ? (
          <span>{selected === 'etco2' ? 'disconnected-etco2' : 'disconnected-spo2'}</span>
        ) : null}
      </div>
    )
  },
}))

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.mocked(playAlarm).mockClear()
    vi.mocked(pauseAlarm).mockClear()
    vi.mocked(playCallerInfoAlert).mockClear()
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
    expect(playCallerInfoAlert).not.toHaveBeenCalled()
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

  it('plays the assignment alert and flashes only for automatic caller info', () => {
    window.history.pushState({}, '', '/')
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '456 Avenue Centrale')
      store.save()
      store.send()
    })

    render(<MonitorPage />)

    expect(playCallerInfoAlert).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('caller-info-alert-flash')).toBeInTheDocument()
  })

  it('does not silence audio on mount, so the first dispatch alert survives', () => {
    window.history.pushState({}, '', '/')
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '456 Avenue Centrale')
      store.save()
      store.send()
    })
    vi.mocked(stopAllAudio).mockClear()

    render(<MonitorPage />)

    // The reset effect also runs on mount, and effects run in declaration
    // order — silencing there killed the alert the caller-info effect had just
    // started, so the first scenario of every session was silent while later
    // dispatches, which do not remount, sounded fine.
    expect(playCallerInfoAlert).toHaveBeenCalled()
    expect(stopAllAudio).not.toHaveBeenCalled()
  })

  it('does not replay the assignment alert for the same dispatch run', () => {
    window.history.pushState({}, '', '/')
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '456 Avenue Centrale')
      store.save()
      store.send()
    })

    const { rerender } = render(<MonitorPage />)
    expect(playCallerInfoAlert).toHaveBeenCalledTimes(1)

    rerender(<MonitorPage />)
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('problem', 'Updated assignment detail')
      store.save()
      store.send()
    })

    expect(screen.getByText('Updated assignment detail')).toBeInTheDocument()
    expect(playCallerInfoAlert).toHaveBeenCalledTimes(1)
  })

  it('replays the assignment alert for a new dispatch run', () => {
    window.history.pushState({}, '', '/')
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', 'First scenario')
      store.setDispatchSeconds(5)
      store.save()
      store.send()
    })

    render(<MonitorPage />)
    expect(playCallerInfoAlert).toHaveBeenCalledTimes(1)

    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', 'Second scenario')
      store.setDispatchSeconds(10)
      store.save()
      store.send()
    })

    expect(screen.getAllByText('Second scenario').length).toBeGreaterThan(0)
    expect(playCallerInfoAlert).toHaveBeenCalledTimes(2)
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
    expect(screen.queryByText('live-spo2')).not.toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()
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
      useMonitorStore.getState().setDraftVitalActive('hr', true)
      useMonitorStore.getState().setDraftVitalActive('bp_sys', true)
      useMonitorStore.getState().setDraftVitalActive('bp_dia', true)
      useMonitorStore.getState().setDraftVitalActive('spo2', true)
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

  it('opens NIBP with physical navigation and completes a recurring automatic reading', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('bp_sys', 110)
      useMonitorStore.getState().setDraft('bp_dia', 70)
      useMonitorStore.getState().setDraftVitalActive('bp_sys', true)
      useMonitorStore.getState().setDraftVitalActive('bp_dia', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    }
    expect(screen.getByText('PNI').closest('[data-selected]')).toHaveAttribute(
      'data-selected',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    expect(screen.getByRole('dialog', { name: 'NIBP settings' })).toBeInTheDocument()
    expect(screen.getByText('NIBP Systolic Alarm')).toHaveAttribute('aria-current', 'true')

    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(screen.getByText('Automatic')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    expect(screen.getByText('1 min')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByRole('dialog', { name: 'NIBP settings' })).toBeNull()

    act(() => { vi.advanceTimersByTime(59_999) })
    expect(screen.queryByText('Please Wait')).toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.getByText('Please Wait')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 100) })
    expect(useMonitorStore.getState().acceptedBp).toEqual({ bp_sys: 110, bp_dia: 70 })
    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('shows typed SpO2 number and selected SpO2 graph after save and send', () => {
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('hr', 150)
      useMonitorStore.getState().setDraft('bp_sys', 110)
      useMonitorStore.getState().setDraft('bp_dia', 70)
      useMonitorStore.getState().setDraft('spo2', 97)
      useMonitorStore.getState().setDraftVitalActive('hr', true)
      useMonitorStore.getState().setDraftVitalActive('bp_sys', true)
      useMonitorStore.getState().setDraftVitalActive('bp_dia', true)
      useMonitorStore.getState().setDraftVitalActive('spo2', true)
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
    expect(screen.getByText('live-spo2')).toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()
  })

  it('uses Regular and Weak CPR FC values without changing the saved rhythm or FC', () => {
    act(() => {
      useMonitorStore.getState().setDraft('hr', 150)
      useMonitorStore.getState().setDraft('rhythm', 'nsr')
      useMonitorStore.getState().setDraft('spo2', 98)
      useMonitorStore.getState().setDraftVitalActive('hr', true)
      useMonitorStore.getState().setDraftVitalActive('spo2', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'true',
    )
    expect(screen.getByText('live-ecg')).toBeInTheDocument()

    act(() => useMonitorStore.getState().setCprMode('regular'))

    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'false',
    )
    expect(screen.getByText('cpr-ecg-canvas')).toBeInTheDocument()
    expect(screen.queryByText('150')).not.toBeInTheDocument()

    act(() => useMonitorStore.getState().setCprMode('weak'))

    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByTestId('spo2-pulse-bar')).toHaveAttribute('data-heart-rate', '90')
    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'false',
    )
    expect(screen.queryByText('120')).not.toBeInTheDocument()
    expect(useMonitorStore.getState().confirmed.hr).toBe(150)
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('nsr')

    act(() => useMonitorStore.getState().setCprMode('off'))

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'true',
    )
    expect(screen.getByText('live-ecg')).toBeInTheDocument()
    expect(screen.queryByText('cpr-ecg-canvas')).not.toBeInTheDocument()
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
      useMonitorStore.getState().setDraftVitalActive('bp_dia', true)
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

  it('keeps typed EtCO2 hidden until CO2 calibration completes', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().setDraft('etco2', 35)
      useMonitorStore.getState().setDraftVitalActive('etco2', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.queryByText('35')).not.toBeInTheDocument()
    expect(screen.queryByText('live-spo2')).not.toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))

    expect(screen.getByText('etco2-loading')).toBeInTheDocument()
    expect(screen.queryByText('35')).not.toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(ETCO2_CALIBRATION_MS) })

    expect(screen.getByText('35')).toBeInTheDocument()
    expect(screen.getByText('live-etco2')).toBeInTheDocument()
    expect(screen.queryByText('live-spo2')).not.toBeInTheDocument()
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
      useMonitorStore.getState().setDraftVitalActive('bp_sys', true)
      useMonitorStore.getState().setDraftVitalActive('bp_dia', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
  })

  it('suppresses only the BP alarm channel during active NIBP readings and restores it on cancel', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 220, bp_dia: 230 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('bp_sys', 118)
      useMonitorStore.getState().setDraft('bp_dia', 76)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
    expect(playAlarm).toHaveBeenCalled()

    vi.mocked(playAlarm).mockClear()
    vi.mocked(pauseAlarm).mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))

    expect(screen.getByText('PNI').closest('[data-alarming]')).toBeNull()
    expect(pauseAlarm).toHaveBeenCalled()
    expect(playAlarm).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(3000 + 500) })
    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')

    vi.mocked(playAlarm).mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))

    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
    expect(playAlarm).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('restores BP alarm behavior after a completed alarming NIBP reading', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 120, bp_dia: 80 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('bp_sys', 220)
      useMonitorStore.getState().setDraft('bp_dia', 230)
      useMonitorStore.getState().setDraftVitalActive('bp_sys', true)
      useMonitorStore.getState().setDraftVitalActive('bp_dia', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))
    expect(screen.getByText('PNI').closest('[data-alarming]')).toBeNull()

    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 100) })

    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
    expect(playAlarm).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('keeps HR and SpO2 alarms active while BP alarm is suppressed during NIBP', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().acceptBpReading(
        { bp_sys: 220, bp_dia: 230 },
        { bp_sys: true, bp_dia: true },
      )
      useMonitorStore.getState().setDraft('hr', 150)
      useMonitorStore.getState().setDraft('spo2', 80)
      useMonitorStore.getState().setDraftVitalActive('hr', true)
      useMonitorStore.getState().setDraftVitalActive('spo2', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    vi.mocked(playAlarm).mockClear()
    vi.mocked(pauseAlarm).mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Patient event' }))

    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
    expect(screen.getByText('SpO2').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
    expect(screen.getByText('PNI').closest('[data-alarming]')).toBeNull()
    expect(pauseAlarm).not.toHaveBeenCalled()
    vi.useRealTimers()
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

  it('shows selected SpO2 graph after the SpO2 vital toggle is saved and sent', () => {
    act(() => {
      useMonitorStore.getState().setDraft('rhythm', 'nsr')
      useMonitorStore.getState().setDraftVitalActive('spo2', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('live-ecg')).toBeInTheDocument()
    expect(screen.getByText('live-spo2')).toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()
  })

  it('uses the CO2 soft key to calibrate and switch the single secondary graph slot to EtCO2', () => {
    vi.useFakeTimers()
    act(() => {
      useMonitorStore.getState().setDraft('spo2', 97)
      useMonitorStore.getState().setDraft('etco2', 35)
      useMonitorStore.getState().setDraftVitalActive('spo2', true)
      useMonitorStore.getState().setDraftVitalActive('etco2', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('live-spo2')).toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))

    expect(screen.getByText('etco2-loading')).toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(ETCO2_CALIBRATION_MS) })

    expect(screen.getByText('live-etco2')).toBeInTheDocument()
    expect(screen.queryByText('live-spo2')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('hides live secondary graphs after their vital toggles are turned off and sent', () => {
    act(() => {
      useMonitorStore.getState().setDraftVitalActive('spo2', true)
      useMonitorStore.getState().setDraftVitalActive('etco2', true)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)

    expect(screen.getByText('live-spo2')).toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()

    act(() => {
      useMonitorStore.getState().setDraftVitalActive('spo2', false)
      useMonitorStore.getState().setDraftVitalActive('etco2', false)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    expect(screen.queryByText('live-spo2')).not.toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()
    expect(screen.getByText('disconnected-spo2')).toBeInTheDocument()
  })

  it('reports EtCO2 calibration to the instructor only once it completes', () => {
    vi.useFakeTimers()
    const onStudentEvent = vi.fn()
    render(<MonitorPageWithProps onStudentEvent={onStudentEvent} />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    act(() => { vi.advanceTimersByTime(ETCO2_CALIBRATION_MS - 1) })
    expect(onStudentEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'etco2_calibration' }),
    )

    // Calibration status lives only in the trainee's own store, so this event is
    // the sole way the instructor roster ever learns about it.
    act(() => { vi.advanceTimersByTime(1) })
    expect(onStudentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'etco2_calibration' }),
    )
    vi.useRealTimers()
  })

  it('silences in-flight audio on a drill reset', () => {
    render(<MonitorPage />)
    vi.mocked(stopAllAudio).mockClear()

    // The CPR metronome is a module singleton, so nothing about a reset or the
    // New Attempt remount stopped it — it ran until someone hit mute.
    act(() => useMonitorStore.getState().reset())

    expect(stopAllAudio).toHaveBeenCalled()
  })

  it('silences audio when the monitor unmounts', () => {
    const { unmount } = render(<MonitorPage />)
    vi.mocked(stopAllAudio).mockClear()

    unmount()

    expect(stopAllAudio).toHaveBeenCalled()
  })

  it('shows EtCO2 loading on first toggle and only marks it loaded after the full calibration time', () => {
    vi.useFakeTimers()
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.getByText('showing-etco2')).toBeInTheDocument()
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(ETCO2_CALIBRATION_MS - 1) })
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
    act(() => { vi.advanceTimersByTime(ETCO2_CALIBRATION_MS - 1) })
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('makes EtCO2 load again after monitor reset', () => {
    vi.useFakeTimers()
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    act(() => { vi.advanceTimersByTime(ETCO2_CALIBRATION_MS) })
    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.queryByText('etco2-loading')).not.toBeInTheDocument()

    act(() => useMonitorStore.getState().resetMonitorVitals())
    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.getByText('etco2-loading')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('returns the selected secondary graph to SpO2 after monitor reset', () => {
    vi.useFakeTimers()
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    act(() => { vi.advanceTimersByTime(ETCO2_CALIBRATION_MS) })
    expect(screen.getByText('showing-etco2')).toBeInTheDocument()

    act(() => useMonitorStore.getState().resetMonitorVitals())

    expect(screen.queryByText('showing-etco2')).not.toBeInTheDocument()
    expect(screen.queryByText('live-etco2')).not.toBeInTheDocument()
    expect(screen.getByText('disconnected-spo2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(screen.getByText('showing-etco2')).toBeInTheDocument()
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

  it('renders merged Call and medication rows in chronological order', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T17:41:28Z'))
    act(() => {
      const store = useMonitorStore.getState()
      store.acknowledgeCall('12:41:18')
      store.arriveCall('12:41:21')
      store.transportCall('12:41:52')
    })
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Treatment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Administer O2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Med Info' }))

    const rows = within(screen.getByRole('region', { name: 'Event log' }))
      .getAllByRole('listitem')
      .map((row) => row.textContent)
    expect(rows).toEqual([
      'Call - Acknowledge12:41:18',
      'Call - Arrival12:41:21',
      'O212:41:28',
      'Call - Transport12:41:52',
    ])
    vi.useRealTimers()
  })

  it('paginates the merged dispatch and medication event log with shell navigation', () => {
    act(() => {
      const store = useMonitorStore.getState()
      store.acknowledgeCall('13:00:00')
      store.arriveCall('13:01:00')
      store.transportCall('13:02:00')
    })
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Treatment' }))
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Administer O2' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Med Info' }))

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Exit')).toHaveAttribute('aria-current', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('records trainee-visible vitals every five minutes and opens them from Home', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    act(() => {
      const store = useMonitorStore.getState()
      store.setDraft('hr', 88)
      store.setDraft('bp_sys', 130)
      store.setDraft('bp_dia', 75)
      store.setDraft('etco2', 36)
      store.setDraft('spo2', 97)
      store.setDraftVitalActive('hr', true)
      store.setDraftVitalActive('bp_sys', true)
      store.setDraftVitalActive('bp_dia', true)
      store.setDraftVitalActive('etco2', true)
      store.setDraftVitalActive('spo2', true)
      store.save()
      store.send()
      store.acceptBpReading(
        { bp_sys: 118, bp_dia: 76 },
        { bp_sys: true, bp_dia: false },
      )
      store.startEtco2Calibration()
      store.completeEtco2Calibration()
      store.setCprMode('weak')
    })

    render(<MonitorPage />)
    act(() => {
      vi.advanceTimersByTime(300_000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))

    const vitalLog = screen.getByRole('region', { name: 'Vital Log' })
    expect(screen.getByRole('heading', { name: 'Vital Log' })).toBeInTheDocument()
    expect(vitalLog).toHaveTextContent('00:05:00')
    expect(vitalLog).toHaveTextContent('90')
    expect(vitalLog).toHaveTextContent('118')
    expect(vitalLog).toHaveTextContent('36')
    expect(vitalLog).toHaveTextContent('97')
    expect(vitalLog).toHaveTextContent('-')

    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.queryByRole('region', { name: 'Vital Log' })).toBeNull()
  })

  it('keeps recorded Vital Log rows across an instructor monitor reset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    render(<MonitorPage />)

    act(() => {
      vi.advanceTimersByTime(300_000)
      useMonitorStore.getState().resetMonitorVitals()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))

    expect(
      within(screen.getByRole('region', { name: 'Vital Log' })).getByText('00:05:00'),
    ).toBeInTheDocument()
  })

  it('paginates twelve Vital Log rows with the physical navigation buttons', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    render(<MonitorPage />)

    act(() => {
      vi.advanceTimersByTime(3_600_000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('00:40:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('00:45:00')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Vital Log' })).getByText('01:00:00'),
    ).toBeInTheDocument()
  })

  it('blocks every other modal opener until Vital Log closes', () => {
    render(<MonitorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    fireEvent.click(screen.getByRole('button', { name: 'Call Info (sidebar)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Patient Info' }))
    fireEvent.click(screen.getByRole('button', { name: 'Treatment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Med Info' }))

    expect(screen.getByRole('heading', { name: 'Vital Log' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'New Assignment' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Patient Info' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Event log' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByRole('heading', { name: 'Vital Log' })).toBeNull()
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
    expect(screen.getByText('disconnected-etco2')).toBeInTheDocument()
    expect(screen.getByText('disconnected-spo2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle bottom status panel' })).toHaveClass(
      'bg-[var(--color-selection-blue)]',
      'text-white',
    )
  })
})
