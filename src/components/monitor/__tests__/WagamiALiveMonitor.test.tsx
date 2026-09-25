import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ETCO2_CALIBRATION_MS } from '@/components/monitor/SecondaryChannel'
import { useMonitorStore } from '@/store/monitorStore'
import type { MonitorProjection } from '@/types/monitorProjection'
import { MonitorPage, type StudentEventRecord } from '../MonitorPage'

function powerOnWagamiA(keepFakeTimers = false) {
  vi.useFakeTimers()
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    vi.advanceTimersByTime(3000)
  })
  if (!keepFakeTimers) vi.useRealTimers()
}

describe('Wagami A live Attempt integration', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    window.localStorage.clear()
    useMonitorStore.getState().reset()
    act(() => {
      useMonitorStore.setState({
        defibrillatorModelDraft: 'wagamiA',
        defibrillatorModelSaved: 'wagamiA',
        defibrillatorModelConfirmed: 'wagamiA',
      })
    })
  })

  afterEach(() => vi.useRealTimers())

  it('renders the live device, records semantic actions, and publishes A state', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    act(() => useMonitorStore.setState((state) => ({
      confirmed: { ...state.confirmed, etco2: 35, etco2_waveform: 'normal' },
      confirmedVitalActive: { ...state.confirmedVitalActive, etco2: true },
    })))
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    expect(screen.getByTestId('wagami-a-live')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-screen-off')).toBeInTheDocument()

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(screen.getByTestId('wagami-a-startup-screen')).toBeInTheDocument()
    expect(events).not.toContainEqual({ kind: 'power_on', label: 'Power On' })
    expect(projections.at(-1)).toMatchObject({
      powerState: 'booting',
      powerStateEndsAt: Date.now() + 3000,
    })
    act(() => vi.advanceTimersByTime(2999))
    expect(screen.getByTestId('wagami-a-startup-screen')).toBeInTheDocument()
    act(() => useMonitorStore.setState((state) => ({
      confirmed: { ...state.confirmed, hr: 145 },
      confirmedVitalActive: { ...state.confirmedVitalActive, hr: true },
    })))
    act(() => vi.advanceTimersByTime(1))
    vi.useRealTimers()
    expect(screen.getByTestId('wagami-a-current-mode')).toHaveTextContent('ADULTE')
    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('145')
    expect(screen.getByLabelText('Temps écoulé du moniteur')).toHaveTextContent('00:00:00')
    expect(screen.getByLabelText('Date et heure de Montréal')).toBeInTheDocument()
    expect(screen.queryByText(/EN DIRECT|DONNÉES CONFIRMÉES/)).not.toBeInTheDocument()
    expect(events).toContainEqual({ kind: 'power_on', label: 'Power On' })

    fireEvent.click(screen.getByRole('button', { name: 'Médicaments' }))
    fireEvent.click(screen.getByRole('button', { name: /Epi/ }))

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'medication', label: 'Epi' }),
    ]))
    await waitFor(() => {
      expect(projections.at(-1)).toMatchObject({
        model: 'wagamiA',
        powerState: 'on',
        wagamiA: {
          waveformResetVersion: useMonitorStore.getState().monitorResetVersion,
          view: 'medications',
          preferences: { locale: 'fr', shellAlarmLedEnabled: true, vitalLogInterval: 5 },
          medicationEvents: [expect.objectContaining({ medication: 'Epi' })],
        },
      })
    })
  })

  it('cancels an unfinished startup on monitor reset without a late Power On event', () => {
    vi.useFakeTimers()
    const events: StudentEventRecord[] = []
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(screen.getByTestId('wagami-a-startup-screen')).toBeInTheDocument()
    act(() => useMonitorStore.getState().resetMonitorVitals())
    expect(screen.getByTestId('wagami-a-screen-off')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByTestId('wagami-a-screen-off')).toBeInTheDocument()
    expect(events).not.toContainEqual({ kind: 'power_on', label: 'Power On' })
    expect(events).not.toContainEqual({ kind: 'power_off', label: 'Power Off' })
  })

  it('shows live FC and SpO₂ alarm flashes independently of mute', () => {
    act(() => useMonitorStore.setState((state) => ({
      confirmed: { ...state.confirmed, hr: 150, spo2: 88 },
      confirmedVitalActive: {
        ...state.confirmedVitalActive,
        hr: true,
        spo2: true,
      },
    })))
    render(<MonitorPage transportStorageScope="ABC234.participant-1.1" />)

    powerOnWagamiA()
    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveClass('wagami-a-vital-alarm-pulse')
    expect(screen.getByTestId('wagami-a-vital-spo2')).toHaveClass('wagami-a-vital-alarm-pulse')

    fireEvent.click(screen.getByRole('button', { name: 'Couper tous les sons' }))
    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveClass('wagami-a-vital-alarm-pulse')
    expect(screen.getByTestId('wagami-a-vital-spo2')).toHaveClass('wagami-a-vital-alarm-pulse')
  })

  it('halts shockable analysis when Instructor CPR contaminates the live signal', () => {
    vi.useFakeTimers()
    const events: StudentEventRecord[] = []
    act(() => useMonitorStore.setState((state) => ({
      confirmed: { ...state.confirmed, rhythm: 'vf' },
      confirmedVitalActive: { ...state.confirmedVitalActive, hr: true },
      cprMode: 'regular',
    })))
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
      />,
    )

    powerOnWagamiA(true)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Analyser WAGAMI A' })))
    act(() => vi.advanceTimersByTime(5000))

    const defibPanel = screen.getByRole('region', { name: 'Wagami A defibrillation status' })
    expect(within(defibPanel).getByRole('status')).toHaveTextContent('ANALYSE INTERROMPUE')
    expect(screen.getByRole('button', { name: 'Choc WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(0)
    expect(events).toContainEqual({
      kind: 'analyze',
      label: 'Analyze - Halted',
      payload: {
        result: 'halted',
        underlyingRhythm: 'vf',
        reason: 'cpr_compression',
      },
    })

    act(() => vi.advanceTimersByTime(4000))
    expect(within(defibPanel).getByRole('status')).toHaveTextContent('EN ATTENTE')
  })

  it('opens PNI settings without recording a clinical action and projects the view', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    powerOnWagamiA()
    events.length = 0
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }))

    expect(screen.getByRole('heading', { name: 'Réglages PNI' })).toBeInTheDocument()
    expect(events).toEqual([])
    await waitFor(() => {
      expect(projections.at(-1)?.wagamiA?.view).toBe('nibpSettings')
    })
  })

  it('projects the A-only Vital Log interval without recording an Evaluation action', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    powerOnWagamiA()
    fireEvent.click(screen.getByRole('button', { name: 'Journal des signes vitaux' }))
    events.length = 0
    fireEvent.click(screen.getByRole('button', { name: '3 min' }))

    expect(screen.getByRole('button', { name: '3 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(events).toEqual([])
    await waitFor(() => {
      expect(projections.at(-1)?.wagamiA?.preferences.vitalLogInterval).toBe(3)
    })
  })

  it('projects inline EtCO₂ timing, cancellation, and success-only logging', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-23T12:00:00Z'))
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    act(() => useMonitorStore.setState((state) => ({
      confirmed: { ...state.confirmed, etco2: 35, etco2_waveform: 'normal' },
      confirmedVitalActive: { ...state.confirmedVitalActive, etco2: true },
    })))
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    powerOnWagamiA(true)
    expect(screen.getByTestId('wagami-a-vital-etco2')).toHaveTextContent('--')
    events.length = 0

    act(() => fireEvent.click(screen.getByRole('button', { name: 'EtCO₂' })))
    expect(projections.at(-1)?.wagamiA).toMatchObject({
      view: 'monitor',
      etco2CalibrationStatus: 'calibrating',
      etco2CalibrationStartedAt: Date.now(),
      etco2CalibrationEndsAt: Date.now() + ETCO2_CALIBRATION_MS,
    })
    expect(projections.at(-1)?.displayedEtco2).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'EtCO₂' }))
    expect(projections.at(-1)?.wagamiA?.etco2CalibrationStatus).toBe('cancelled')
    expect(events).toEqual([])

    act(() => vi.advanceTimersByTime(3000))
    fireEvent.click(screen.getByRole('button', { name: 'EtCO₂' }))
    act(() => vi.advanceTimersByTime(ETCO2_CALIBRATION_MS))
    expect(screen.getByTestId('wagami-a-vital-etco2')).toHaveTextContent('35')
    expect(events).toEqual([
      {
        kind: 'etco2_calibration',
        label: 'EtCO2 Calibrated',
        payload: { monitorResetVersion: useMonitorStore.getState().monitorResetVersion },
      },
    ])
    expect(projections.at(-1)?.wagamiA?.etco2CalibrationStatus).toBe('calibrated')
    expect(projections.at(-1)?.displayedEtco2).toBe(35)
  })

  it('projects shared 12-lead Patient Information without recording a new clinical event', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    powerOnWagamiA()
    fireEvent.click(screen.getByRole('button', { name: '12 dérivations' }))
    events.length = 0
    fireEvent.click(screen.getByRole('button', { name: 'Info patient' }))
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter l’âge' }))
    fireEvent.click(screen.getByRole('button', { name: 'F' }))

    expect(useMonitorStore.getState().patientInfo).toEqual({ age: 41, sex: 'F' })
    expect(events).toEqual([])
    await waitFor(() => {
      expect(projections.at(-1)).toMatchObject({
        patientInfo: { age: 41, sex: 'F' },
        wagamiA: {
          view: 'twelveLead',
          twelveLead: { patientInfoOpen: true },
        },
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Terminé' }))
    await waitFor(() => {
      expect(projections.at(-1)?.wagamiA?.twelveLead.patientInfoOpen).toBe(false)
    })
  })

  it('reopens Call Info as a full-page live dispatch workflow and projects the page', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    act(() => useMonitorStore.setState((state) => ({
      confirmed: { ...state.confirmed, rhythm: 'nsr' },
      confirmedVitalActive: { ...state.confirmedVitalActive, hr: true },
    })))
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    powerOnWagamiA()
    const ecg = screen.getByTestId('live-ecg-canvas')
    fireEvent.click(screen.getByRole('button', { name: 'Info appel' }))

    expect(screen.getByTestId('wagami-a-call-info-page')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell').parentElement).toHaveClass('invisible')
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.getByTestId('assignment-dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Response timer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeEnabled()
    await waitFor(() => expect(projections.at(-1)?.wagamiA?.view).toBe('callInfo'))

    fireEvent.click(screen.getByRole('button', { name: 'Transport' }))
    expect(events).toContainEqual(expect.objectContaining({ kind: 'transport', label: 'Transport' }))

    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(screen.getByTestId('wagami-a-shell')).toBeInTheDocument()
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.queryByTestId('wagami-a-call-info-page')).not.toBeInTheDocument()
  })

  it('preserves A language on the full-page caller surface', () => {
    render(<MonitorPage transportStorageScope="ABC234.participant-1.1" />)
    powerOnWagamiA()
    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: /Back/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Call Info' }))
    expect(screen.getByRole('heading', { name: 'Call information' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
    expect(within(screen.getByTestId('wagami-a-call-info-page')).getByTestId('wagami-a-clinical-status-line')).toHaveTextContent('MODE ADULT')
  })

  it('resets device preferences for a new Attempt scope', async () => {
    const first = render(
      <MonitorPage
        key="attempt-1"
        transportStorageScope="ABC234.participant-1.1"
      />,
    )
    powerOnWagamiA()
    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: 'Off' }))
    expect(screen.getByRole('heading', { name: 'Configure' })).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'false')
    fireEvent.click(screen.getByRole('button', { name: /Back/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Vital Log' }))
    fireEvent.click(screen.getByRole('button', { name: '3 min' }))
    first.unmount()

    render(
      <MonitorPage
        key="attempt-2"
        transportStorageScope="ABC234.participant-1.2"
      />,
    )
    powerOnWagamiA()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Configurer' })).toBeInTheDocument()
      expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'true')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Journal des signes vitaux' }))
    expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true')
  })
})
