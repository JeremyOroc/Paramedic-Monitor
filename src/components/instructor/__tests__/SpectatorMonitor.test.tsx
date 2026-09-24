import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { MonitorProjection } from '@/types/monitorProjection'
import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'
import { DEFAULT_VITALS } from '@/types/vitals'
import { SpectatorMonitor } from '../SpectatorMonitor'

describe('SpectatorMonitor A2 model boundary', () => {
  it('mirrors Wagami A Call Info across the spectator canvas without a shell or live actions', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      date: '2026-09-22',
      time: '20:19:40',
      sessionTimer: '00:07:23',
      controller: { isMuted: false },
      defib: { state: 'idle', energy: 120, progress: 0, phaseStartedAt: null, phaseEndsAt: null },
      confirmed: DEFAULT_VITALS,
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 120, bp_dia: 80 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: ['hr'],
      nibp: { enabled: true, phase: 'idle', displayValue: '' },
      callerInfo: DEFAULT_CALLER_INFO,
      dispatchRoute: { geometry: [] },
      dispatch: { countdownLocked: true, transportedAt: null },
      countdownFormatted: '00:00',
      responseTimer: '03:12',
      callerInfoVariant: 'assignment',
      cprOverrideActive: false,
      wagamiA: {
        view: 'callInfo',
        preferences: { locale: 'fr', shellAlarmLedEnabled: true },
        patientMode: 'adult',
        etco2CalibrationStatus: 'idle',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    const { rerender } = render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByTestId('wagami-a-call-info-page')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell').parentElement).toHaveClass('invisible')
    const ecg = screen.getByTestId('live-ecg-canvas')
    expect(screen.getByTestId('assignment-dashboard')).toBeInTheDocument()
    expect(within(screen.getByTestId('wagami-a-call-info-page')).getByTestId('wagami-a-clinical-status-line')).toHaveTextContent('MODE ADULTE · ALARME · FC')
    expect(screen.getByRole('button', { name: /Retour/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeDisabled()

    const calibrationStartedAt = Date.now() - 22_500
    const calibrationEndsAt = Date.now() + 22_500
    rerender(<SpectatorMonitor projection={{
      ...projection,
      wagamiA: {
        ...projection.wagamiA!,
        view: 'monitor',
        etco2CalibrationStatus: 'calibrating',
        etco2CalibrationStartedAt: calibrationStartedAt,
        etco2CalibrationEndsAt: calibrationEndsAt,
      },
    }} embedded />)
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.getByTestId('wagami-a-shell').parentElement).not.toHaveClass('invisible')
    expect(screen.getByLabelText('Date et heure de Montréal')).toHaveTextContent('2026-09-22 20:19:40')
    expect(screen.getByLabelText('Temps écoulé du moniteur')).toHaveTextContent('00:07:23')
    expect(screen.getByTestId('wagami-a-vital-etco2')).toHaveTextContent('--')
    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveClass('wagami-a-vital-alarm')
    expect(screen.getByTestId('wagami-a-vital-spo2')).not.toHaveClass('wagami-a-vital-alarm')
    expect(screen.getByText('ÉTALONNAGE…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EtCO₂' })).toHaveAttribute('aria-pressed', 'true')
    const progress = screen.getByRole('progressbar', { name: 'ÉTALONNAGE…' })
    expect(Number(progress.getAttribute('value'))).toBeGreaterThanOrEqual(49)
    expect(Number(progress.getAttribute('value'))).toBeLessThanOrEqual(51)
  })

  it('keeps the initial Wagami A dispatch gate shell-free in Spectator', () => {
    const projection = {
      model: 'wagamiA',
      surface: 'dispatch',
      controller: { isPoweredOn: false },
      defib: { state: 'idle', progress: 0, phaseStartedAt: null, phaseEndsAt: null },
      callerInfo: DEFAULT_CALLER_INFO,
      dispatchRoute: { geometry: [] },
      dispatch: { countdownLocked: true, transportedAt: null },
      countdownFormatted: '04:20',
      responseTimer: '00:40',
      callerInfoVariant: 'assignment',
      wagamiA: { preferences: { locale: 'fr' } },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)
    expect(screen.getByTestId('assignment-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('wagami-a-shell')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Response timer')).toHaveTextContent('00:40')
    expect(screen.getByRole('button', { name: 'Accuser réception' })).toBeDisabled()
  })

  it('does not silently display an A projection as Wagami X', () => {
    const projection = {
      model: 'wagamiA',
      defib: { progress: 0, phaseStartedAt: null, phaseEndsAt: null },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByText('WAGAMI A · STATE UNAVAILABLE')).toBeInTheDocument()
    expect(screen.queryByTestId('device-shell')).not.toBeInTheDocument()
  })

  it('mirrors an A5 destination, locale, and shell LED preference from semantic projection state', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      controller: { isMuted: false },
      defib: { state: 'idle', energy: 120, progress: 0, phaseStartedAt: null, phaseEndsAt: null, canAnalyse: true, canCharge: true, canShock: false, canAdjustEnergy: true },
      confirmed: { hr: 80, bp_sys: 120, bp_dia: 80, etco2: 35, spo2: 98, rhythm: 'nsr', spo2_waveform: 'normal', etco2_waveform: 'normal' },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 118, bp_dia: 76 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: [],
      nibp: { enabled: true, phase: 'idle', displayValue: '' },
      callerInfo: { callNumber: '', priority: '', mpdsCode: '', address: '', problem: '', information: '', update: '', extra1Label: '', extra1: '', extra2Label: '', extra2: '', extra3Label: '', extra3: '', time: '' },
      dispatchRoute: { geometry: [] },
      cprOverrideActive: false,
      wagamiA: {
        view: 'vitalLog',
        preferences: { locale: 'en', shellAlarmLedEnabled: false, vitalLogInterval: 3 },
        etco2CalibrationStatus: 'idle',
        patientMode: 'adult',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByRole('heading', { name: 'Vital Log' })).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'false')
    expect(screen.getByRole('group', { name: 'Vital Log interval' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '3 min' })).toBeDisabled()
    expect(screen.queryByText('WAGAMI A · STATE UNAVAILABLE')).not.toBeInTheDocument()
  })

  it('mirrors Wagami A 12-lead Patient Information as a read-only layer', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      controller: { isMuted: false },
      defib: { state: 'idle', energy: 120, progress: 0, phaseStartedAt: null, phaseEndsAt: null, canAnalyse: true, canCharge: true, canShock: false, canAdjustEnergy: true },
      confirmed: { hr: 80, bp_sys: 120, bp_dia: 80, etco2: 35, spo2: 98, rhythm: 'nsr', spo2_waveform: 'normal', etco2_waveform: 'normal' },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 118, bp_dia: 76 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: [],
      nibp: { enabled: true, phase: 'idle', displayValue: '' },
      patientInfo: { age: 67, sex: 'F' },
      callerInfo: DEFAULT_CALLER_INFO,
      dispatchRoute: { geometry: [] },
      cprOverrideActive: false,
      wagamiA: {
        view: 'twelveLead',
        preferences: { locale: 'en', shellAlarmLedEnabled: true, vitalLogInterval: 5 },
        etco2CalibrationStatus: 'idle',
        patientMode: 'adult',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, patientInfoOpen: true, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByRole('dialog', { name: 'Patient Information' })).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toHaveTextContent('67')
    expect(screen.getByRole('button', { name: 'F' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Decrease age' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
    expect(screen.queryByTestId('wagami-a-twelve-lead-footer')).not.toBeInTheDocument()
  })

  it('mirrors automatic advised charge origin and capacitor progress', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      controller: { isMuted: false },
      defib: { state: 'charging', energy: 120, progress: 0.5, chargeOrigin: 'automatic_advised', phaseStartedAt: null, phaseEndsAt: null, canAnalyse: false, canCharge: false, canShock: false, canAdjustEnergy: false },
      confirmed: { hr: 80, bp_sys: 120, bp_dia: 80, etco2: 35, spo2: 98, rhythm: 'vf', spo2_waveform: 'normal', etco2_waveform: 'normal' },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 118, bp_dia: 76 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: [],
      nibp: { enabled: true, phase: 'idle', displayValue: '' },
      callerInfo: { callNumber: '', priority: '', mpdsCode: '', address: '', problem: '', information: '', update: '', extra1Label: '', extra1: '', extra2Label: '', extra2: '', extra3Label: '', extra3: '', time: '' },
      dispatchRoute: { geometry: [] },
      cprOverrideActive: false,
      wagamiA: {
        view: 'monitor',
        preferences: { locale: 'en', shellAlarmLedEnabled: true },
        etco2CalibrationStatus: 'idle',
        patientMode: 'adult',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByText('SHOCK ADVISED · CHARGING')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(50)
  })

  it('mirrors the projected cuff-pressure count without starting a second clock', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      controller: { isMuted: false },
      defib: { state: 'idle', energy: 120, progress: 0, phaseStartedAt: null, phaseEndsAt: null, canAnalyse: true, canCharge: true, canShock: false, canAdjustEnergy: true },
      confirmed: { hr: 80, bp_sys: 120, bp_dia: 80, etco2: 35, spo2: 98, rhythm: 'nsr', spo2_waveform: 'normal', etco2_waveform: 'normal' },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 118, bp_dia: 76 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: [],
      nibp: { enabled: true, phase: 'counting', displayValue: 72 },
      callerInfo: { callNumber: '', priority: '', mpdsCode: '', address: '', problem: '', information: '', update: '', extra1Label: '', extra1: '', extra2Label: '', extra2: '', extra3Label: '', extra3: '', time: '' },
      dispatchRoute: { geometry: [] },
      cprOverrideActive: false,
      wagamiA: {
        view: 'monitor',
        preferences: { locale: 'en', shellAlarmLedEnabled: true },
        etco2CalibrationStatus: 'idle',
        patientMode: 'adult',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('72')
    expect(screen.getByTestId('wagami-a-vital-pni')).not.toHaveTextContent('118/76')
    expect(screen.getByTestId('wagami-a-vital-pni').tagName).toBe('DIV')
    expect(screen.queryByRole('button', { name: 'Open BP settings' })).not.toBeInTheDocument()
  })
})
